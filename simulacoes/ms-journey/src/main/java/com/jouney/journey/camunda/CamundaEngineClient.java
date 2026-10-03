package com.jouney.journey.camunda;

import com.jouney.journey.config.CamundaProperties;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

/**
 * Wrapper fino da REST API do Camunda 7 (engine-rest) — mirror do recorte necessário de
 * ms-espec-registry's CamundaClient (mesmo motor, mesmas manhas já resolvidas lá), sem o que só o
 * simulador interno do admin precisa (external-task/Kafka, histórico, mensagens).
 */
@Component
public class CamundaEngineClient {

    private final RestClient restClient = RestClient.create();
    private final CamundaProperties properties;

    public CamundaEngineClient(CamundaProperties properties) {
        this.properties = properties;
    }

    public String startProcessInstance(String processDefinitionKey, Map<String, CamundaVariable> variables, String businessKey) {
        Map<String, Object> response = restClient.post()
                .uri(properties.baseUrl() + "/process-definition/key/{key}/start", processDefinitionKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("variables", variables, "businessKey", businessKey))
                .retrieve()
                .body(new ParameterizedTypeReference<Map<String, Object>>() {
                });
        return String.valueOf(response.get("id"));
    }

    public Optional<ProcessInstanceInfo> getProcessInstance(String processInstanceId) {
        try {
            return Optional.ofNullable(restClient.get()
                    .uri(properties.baseUrl() + "/process-instance/{id}", processInstanceId)
                    .retrieve()
                    .body(ProcessInstanceInfo.class));
        } catch (HttpClientErrorException.NotFound e) {
            return Optional.empty();
        }
    }

    public String getJourneyVersionTag(String processDefinitionId) {
        Map<String, Object> definition = restClient.get()
                .uri(properties.baseUrl() + "/process-definition/{id}", processDefinitionId)
                .retrieve()
                .body(new ParameterizedTypeReference<Map<String, Object>>() {
                });
        Object tag = definition != null ? definition.get("versionTag") : null;
        if (!(tag instanceof String value) || !value.startsWith("v")) {
            throw new IllegalStateException("Definição do runtime sem versão de jornada válida");
        }
        return value;
    }

    public List<TaskInfo> findActiveUserTasks(String processInstanceId) {
        List<TaskInfo> tasks = restClient.get()
                .uri(properties.baseUrl() + "/task?processInstanceId={id}", processInstanceId)
                .retrieve()
                .body(new ParameterizedTypeReference<List<TaskInfo>>() {
                });
        return tasks != null ? tasks : List.of();
    }

    public Optional<ActivityInstanceNode> findLeafActivity(String processInstanceId) {
        try {
            ActivityInstanceNode root = restClient.get()
                    .uri(properties.baseUrl() + "/process-instance/{id}/activity-instances", processInstanceId)
                    .retrieve()
                    .body(ActivityInstanceNode.class);
            return Optional.ofNullable(root).map(CamundaEngineClient::leafOf);
        } catch (HttpClientErrorException.NotFound e) {
            return Optional.empty();
        }
    }

    private static ActivityInstanceNode leafOf(ActivityInstanceNode node) {
        List<ActivityInstanceNode> children = node.childActivityInstances();
        if (children == null || children.isEmpty()) {
            return node;
        }
        return leafOf(children.get(0));
    }

    // Só chamado logo depois de confirmar que existe User Task ativa (ver JourneyStepResolver), ou
    // seja, a instância está garantidamente viva — sem o fallback histórico que o CamundaClient
    // original tem pra instância já terminada (não é um caso que ms-journey precisa cobrir aqui).
    public Map<String, CamundaVariable> getProcessVariables(String processInstanceId) {
        Map<String, Map<String, Object>> raw = restClient.get()
                .uri(properties.baseUrl() + "/process-instance/{id}/variables", processInstanceId)
                .retrieve()
                .body(new ParameterizedTypeReference<Map<String, Map<String, Object>>>() {
                });
        // Variável Json (lista gravada pela saída de integração do tipo lista, ADR-002): no modo padrão
        // o motor devolve o objeto técnico do Spin, não o JSON — só pra essas, lê de novo o texto
        // (deserializeValues=false). As de outros tipos continuam como sempre foram lidas.
        Map<String, Map<String, Object>> jsonText = raw != null && raw.values().stream().anyMatch(v -> "Json".equals(v.get("type")))
                ? restClient.get()
                        .uri(properties.baseUrl() + "/process-instance/{id}/variables?deserializeValues=false", processInstanceId)
                        .retrieve()
                        .body(new ParameterizedTypeReference<Map<String, Map<String, Object>>>() {
                        })
                : Map.of();
        Map<String, CamundaVariable> result = new LinkedHashMap<>();
        if (raw != null) {
            raw.forEach((name, v) -> {
                Object value = "Json".equals(v.get("type")) && jsonText != null && jsonText.containsKey(name)
                        ? jsonText.get(name).get("value") : v.get("value");
                result.put(name, new CamundaVariable(value, String.valueOf(v.get("type"))));
            });
        }
        return result;
    }

    public void completeTask(String taskId, Map<String, CamundaVariable> variables) {
        restClient.post()
                .uri(properties.baseUrl() + "/task/{id}/complete", taskId)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("variables", variables))
                .retrieve()
                .toBodilessEntity();
    }

    /** Atividades da instância no histórico do motor, para o "voltar à tela anterior". */
    public List<Map<String, Object>> getActivityHistory(String processInstanceId) {
        List<Map<String, Object>> history = restClient.get()
                .uri(properties.baseUrl() + "/history/activity-instance?processInstanceId={id}&sortBy=startTime&sortOrder=asc",
                        processInstanceId)
                .retrieve()
                .body(new ParameterizedTypeReference<List<Map<String, Object>>>() {
                });
        return history != null ? history : List.of();
    }

    /** Instância ativa (no motor agora) da atividade {@code activityId}, para cancelá-la ao voltar. */
    public Optional<String> findActiveActivityInstanceId(String processInstanceId, String activityId) {
        ActivityInstanceNode root = restClient.get()
                .uri(properties.baseUrl() + "/process-instance/{id}/activity-instances", processInstanceId)
                .retrieve()
                .body(ActivityInstanceNode.class);
        return Optional.ofNullable(root).flatMap(node -> findInstance(node, activityId));
    }

    private static Optional<String> findInstance(ActivityInstanceNode node, String activityId) {
        if (activityId.equals(node.activityId())) {
            return Optional.of(node.id());
        }
        for (ActivityInstanceNode child : node.childActivityInstances() != null ? node.childActivityInstances() : List.<ActivityInstanceNode>of()) {
            Optional<String> found = findInstance(child, activityId);
            if (found.isPresent()) {
                return found;
            }
        }
        return Optional.empty();
    }

    /** Reabre {@code startBeforeActivityId} e cancela a atividade aberta agora, numa operação só
     * (abrir antes de cancelar: cancelar primeiro a única atividade ativa encerraria a instância). */
    public void reopenActivity(String processInstanceId, String startBeforeActivityId, String cancelActivityInstanceId,
                               String annotation) {
        restClient.post()
                .uri(properties.baseUrl() + "/process-instance/{id}/modification", processInstanceId)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of(
                        "skipCustomListeners", false,
                        "skipIoMappings", false,
                        "annotation", annotation,
                        "instructions", List.of(
                                Map.of("type", "startBeforeActivity", "activityId", startBeforeActivityId),
                                Map.of("type", "cancel", "activityInstanceId", cancelActivityInstanceId))))
                .retrieve()
                .toBodilessEntity();
    }

    public void setStringVariable(String processInstanceId, String name, String value) {
        restClient.put()
                .uri(properties.baseUrl() + "/process-instance/{id}/variables/{name}", processInstanceId, name)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("value", value, "type", "String"))
                .retrieve()
                .toBodilessEntity();
    }

    /** Idempotente: 404 (a instância já tinha terminado sozinha nesse meio-tempo) não é erro — encerrar
     * uma execução que já acabou é um no-op, não uma falha. */
    public void deleteProcessInstance(String processInstanceId) {
        try {
            restClient.delete()
                    .uri(properties.baseUrl() + "/process-instance/{id}?skipCustomListeners=true&skipIoMappings=true", processInstanceId)
                    .retrieve()
                    .toBodilessEntity();
        } catch (HttpClientErrorException.NotFound e) {
            // já não existe — objetivo alcançado
        }
    }
}
