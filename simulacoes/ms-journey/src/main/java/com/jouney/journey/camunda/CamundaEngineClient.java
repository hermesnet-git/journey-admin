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
        Map<String, CamundaVariable> result = new LinkedHashMap<>();
        if (raw != null) {
            raw.forEach((name, v) -> result.put(name, new CamundaVariable(v.get("value"), String.valueOf(v.get("type")))));
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
