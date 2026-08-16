package com.jouney.especregistry.camunda;

import com.jouney.especregistry.config.CamundaProperties;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

/**
 * Wrapper fino da REST API do Camunda 7 (engine-rest) — cada método corresponde a exatamente uma
 * chamada do motor, sem lógica de domínio própria. Usado tanto para iniciar/consultar/completar
 * User Tasks quanto para o botão "Simular conclusão" (external task Kafka via fetchAndLock+complete,
 * ou RECEIVE_TASK via correlação de mensagem).
 */
@Component
public class CamundaClient {

    private static final String WORKER_ID = "simulador-elastic-journey";

    // Camunda espera o formato RFC 822 ("+0000"), não o "Z" que Instant#toString produz — testado
    // ao vivo: "startedAfter=...Z" é rejeitado com InvalidRequestException, "...+0000" funciona.
    private static final DateTimeFormatter HISTORY_DATE_FORMAT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSZ").withZone(ZoneOffset.UTC);

    private final RestClient restClient;
    private final String baseUrl;

    public CamundaClient(CamundaProperties properties) {
        this.baseUrl = properties.baseUrl();
        this.restClient = RestClient.create();
    }

    public String startProcessInstance(String processDefinitionKey, Map<String, CamundaVariable> variables) {
        Map<String, Object> response = restClient.post()
                .uri(baseUrl + "/process-definition/key/{key}/start", processDefinitionKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("variables", variables))
                .retrieve()
                .body(new ParameterizedTypeReference<Map<String, Object>>() {
                });
        return String.valueOf(response.get("id"));
    }

    public Optional<ProcessInstanceInfo> getProcessInstance(String processInstanceId) {
        try {
            return Optional.ofNullable(restClient.get()
                    .uri(baseUrl + "/process-instance/{id}", processInstanceId)
                    .retrieve()
                    .body(ProcessInstanceInfo.class));
        } catch (HttpClientErrorException.NotFound e) {
            return Optional.empty();
        }
    }

    public List<TaskInfo> findActiveUserTasks(String processInstanceId) {
        List<TaskInfo> tasks = restClient.get()
                .uri(baseUrl + "/task?processInstanceId={id}", processInstanceId)
                .retrieve()
                .body(new ParameterizedTypeReference<List<TaskInfo>>() {
                });
        return tasks != null ? tasks : List.of();
    }

    // Usa /variables (visíveis, resolvendo escopo), não /localVariables (escopo estrito da Task):
    // camunda:inputParameter numa UserTask cria a variável no escopo da execução do nó, não no da
    // Task em si — /localVariables/{name} nunca a encontra, mesmo ela estando disponível ali.
    public Optional<String> getTaskLocalVariable(String taskId, String name) {
        try {
            Map<String, Object> response = restClient.get()
                    .uri(baseUrl + "/task/{id}/variables/{name}", taskId, name)
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {
                    });
            return Optional.ofNullable(response).map(r -> r.get("value")).map(String::valueOf);
        } catch (HttpClientErrorException.NotFound e) {
            return Optional.empty();
        }
    }

    public void completeTask(String taskId, Map<String, CamundaVariable> variables) {
        restClient.post()
                .uri(baseUrl + "/task/{id}/complete", taskId)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("variables", variables))
                .retrieve()
                .toBodilessEntity();
    }

    public Optional<ActivityInstanceNode> findLeafActivity(String processInstanceId) {
        try {
            ActivityInstanceNode root = restClient.get()
                    .uri(baseUrl + "/process-instance/{id}/activity-instances", processInstanceId)
                    .retrieve()
                    .body(ActivityInstanceNode.class);
            return Optional.ofNullable(root).map(CamundaClient::leafOf);
        } catch (HttpClientErrorException.NotFound e) {
            return Optional.empty();
        }
    }

    private static ActivityInstanceNode leafOf(ActivityInstanceNode node) {
        List<ActivityInstanceNode> children = node.childActivityInstances();
        if (children == null || children.isEmpty()) {
            return node;
        }
        // Os fluxos gerados são sempre sequenciais (sem gateway paralelo), então há no máximo um
        // ramo ativo por vez — o primeiro filho é sempre o único que importa.
        return leafOf(children.get(0));
    }

    /** Completa o external task (SERVICE_TASK com conector Kafka) pendente naquela atividade,
     * travando-o só para esta instância (processInstanceIdIn) para não competir com outras
     * simulações rodando ao mesmo tempo na mesma jornada. */
    public void completeExternalTask(String processInstanceId, String activityId, Map<String, CamundaVariable> variables) {
        List<ExternalTaskInfo> pending = restClient.get()
                .uri(baseUrl + "/external-task?processInstanceId={pid}&activityId={aid}", processInstanceId, activityId)
                .retrieve()
                .body(new ParameterizedTypeReference<List<ExternalTaskInfo>>() {
                });
        if (pending == null || pending.isEmpty()) {
            throw new IllegalStateException(
                    "Nenhum external task pendente para a atividade " + activityId + " na instância " + processInstanceId);
        }
        String topicName = pending.get(0).topicName();

        Map<String, Object> lockBody = Map.of(
                "workerId", WORKER_ID,
                "maxTasks", 1,
                "topics", List.of(Map.of(
                        "topicName", topicName,
                        "lockDuration", 30000,
                        "processInstanceIdIn", List.of(processInstanceId))));
        List<Map<String, Object>> locked = restClient.post()
                .uri(baseUrl + "/external-task/fetchAndLock")
                .contentType(MediaType.APPLICATION_JSON)
                .body(lockBody)
                .retrieve()
                .body(new ParameterizedTypeReference<List<Map<String, Object>>>() {
                });
        if (locked == null || locked.isEmpty()) {
            throw new IllegalStateException("Não foi possível travar o external task da atividade " + activityId);
        }
        String externalTaskId = String.valueOf(locked.get(0).get("id"));

        restClient.post()
                .uri(baseUrl + "/external-task/{id}/complete", externalTaskId)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("workerId", WORKER_ID, "variables", variables))
                .retrieve()
                .toBodilessEntity();
    }

    /** Todas as variáveis visíveis no escopo do processo agora — inclui tudo que outputMapping de
     * SERVICE_TASK/RECEIVE_TASK já escreveu, já que nossos fluxos nunca têm mais de uma execução
     * viva ao mesmo tempo (sem gateway paralelo/subprocesso/multi-instância). */
    public Map<String, CamundaVariable> getProcessVariables(String processInstanceId) {
        Map<String, Map<String, Object>> raw = restClient.get()
                .uri(baseUrl + "/process-instance/{id}/variables", processInstanceId)
                .retrieve()
                .body(new ParameterizedTypeReference<Map<String, Map<String, Object>>>() {
                });
        if (raw == null) {
            return Map.of();
        }
        Map<String, CamundaVariable> result = new java.util.LinkedHashMap<>();
        raw.forEach((name, v) -> result.put(name, new CamundaVariable(v.get("value"), String.valueOf(v.get("type")))));
        return result;
    }

    public void setProcessVariable(String processInstanceId, String name, CamundaVariable variable) {
        restClient.put()
                .uri(baseUrl + "/process-instance/{id}/variables/{name}", processInstanceId, name)
                .contentType(MediaType.APPLICATION_JSON)
                .body(variable)
                .retrieve()
                .toBodilessEntity();
    }

    /** Atividades que rodaram sozinhas (sem parar) entre {@code since} e agora — usado para revelar
     * no simulador SERVICE_TASK/gateway/END que o motor atravessou de uma vez só numa mesma
     * transição (ex.: verificação de elegibilidade + aplicação de troca de plano + fim), que de
     * outra forma ficariam invisíveis por nunca aparecerem como o "passo atual". */
    public List<HistoricActivityInstance> getActivityHistorySince(String processInstanceId, Instant since) {
        List<HistoricActivityInstance> list = restClient.get()
                .uri(baseUrl + "/history/activity-instance?processInstanceId={id}&startedAfter={since}&sortBy=startTime&sortOrder=asc",
                        processInstanceId, HISTORY_DATE_FORMAT.format(since))
                .retrieve()
                .body(new ParameterizedTypeReference<List<HistoricActivityInstance>>() {
                });
        return list != null ? list : List.of();
    }

    public void correlateMessage(String messageName, String processInstanceId, Map<String, CamundaVariable> variables) {
        restClient.post()
                .uri(baseUrl + "/message")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of(
                        "messageName", messageName,
                        "processInstanceId", processInstanceId,
                        "processVariables", variables))
                .retrieve()
                .toBodilessEntity();
    }
}
