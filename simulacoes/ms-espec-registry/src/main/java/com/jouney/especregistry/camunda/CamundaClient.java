package com.jouney.especregistry.camunda;

import com.jouney.especregistry.config.CamundaProperties;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Wrapper fino da REST API do Camunda 7 (engine-rest) — cada método corresponde a exatamente uma
 * chamada do motor, sem lógica de domínio própria. Usado tanto para iniciar/consultar/completar
 * User Tasks quanto para o botão "Simular conclusão" (external task Kafka via fetchAndLock+complete,
 * ou RECEIVE_TASK via correlação de mensagem).
 */
@Component
public class CamundaClient {

    private static final String WORKER_ID = "simulador-elastic-journey";
    private static final String KAFKA_BRIDGE_WORKER_ID = "kafka-bridge-scheduler";

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

    // businessKey é obrigatório (não Optional): toda instância precisa de um, mesmo que iniciada
    // manualmente — é o único jeito de uma RECEIVE_TASK futura ser correlacionada de volta a ela via
    // Kafka (ver findProcessInstanceByBusinessKey).
    public String startProcessInstance(String processDefinitionKey, Map<String, CamundaVariable> variables, String businessKey) {
        Map<String, Object> response = restClient.post()
                .uri(baseUrl + "/process-definition/key/{key}/start", processDefinitionKey)
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
                    .uri(baseUrl + "/process-instance/{id}", processInstanceId)
                    .retrieve()
                    .body(ProcessInstanceInfo.class));
        } catch (HttpClientErrorException.NotFound e) {
            return Optional.empty();
        }
    }

    /** Resolve um businessKey pra um processInstanceId exato, já restrito à definição de processo
     * certa — usado pelo bridge Kafka pra correlacionar uma RECEIVE_TASK sem depender do nome da
     * mensagem ser único entre jornadas (não é: jornadas geradas do mesmo template reaproveitam os
     * mesmos ids de nó, então "Message_&lt;nodeId&gt;" pode colidir entre definições de processo
     * diferentes — restringir por processDefinitionKey aqui é o que evita correlacionar/iniciar a
     * jornada errada). */
    public Optional<ProcessInstanceInfo> findProcessInstanceByBusinessKey(String businessKey, String processDefinitionKey) {
        List<ProcessInstanceInfo> found = restClient.get()
                .uri(baseUrl + "/process-instance?businessKey={businessKey}&processDefinitionKey={key}", businessKey, processDefinitionKey)
                .retrieve()
                .body(new ParameterizedTypeReference<List<ProcessInstanceInfo>>() {
                });
        return found == null || found.isEmpty() ? Optional.empty() : Optional.of(found.get(0));
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
        completeExternalTaskById(externalTaskId, WORKER_ID, variables);
    }

    /** Completa um external task já travado, dado só o seu id — usado tanto pelo
     * {@link #completeExternalTask} (botão "Simular conclusão", trava e completa em um passo) quanto
     * pelo {@link #fetchAndLockAll} (worker do bridge Kafka, que trava vários de uma vez). */
    public void completeExternalTaskById(String externalTaskId, Map<String, CamundaVariable> variables) {
        completeExternalTaskById(externalTaskId, KAFKA_BRIDGE_WORKER_ID, variables);
    }

    private void completeExternalTaskById(String externalTaskId, String workerId, Map<String, CamundaVariable> variables) {
        restClient.post()
                .uri(baseUrl + "/external-task/{id}/complete", externalTaskId)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("workerId", workerId, "variables", variables))
                .retrieve()
                .toBodilessEntity();
    }

    /** Libera um external task travado sem completá-lo — usado pelo worker do bridge Kafka quando,
     * só depois de já ter travado a task (fetchAndLockAll não filtra por instância, só por tópico),
     * descobre que ela pertence a uma instância em modo de controle manual. Sem isso o lock (30s,
     * renovado a cada tick de 3s) nunca soltaria, e o envio manual (SimulationController) nunca
     * conseguiria travar essa mesma task pra completá-la de verdade. */
    public void unlockExternalTask(String externalTaskId) {
        restClient.post()
                .uri(baseUrl + "/external-task/{id}/unlock", externalTaskId)
                .retrieve()
                .toBodilessEntity();
    }

    /** Trava em lote, num único fetchAndLock, todos os external tasks pendentes nos tópicos dados —
     * usado pelo worker do bridge Kafka (que não sabe de antemão quais instâncias/atividades tem
     * tarefa pendente, ao contrário de {@link #completeExternalTask}, que já sabe exatamente qual). */
    public List<LockedExternalTask> fetchAndLockAll(Collection<String> topicNames) {
        if (topicNames.isEmpty()) {
            return List.of();
        }
        List<Map<String, Object>> topics = topicNames.stream()
                .map(topic -> Map.<String, Object>of("topicName", topic, "lockDuration", 30000))
                .toList();
        Map<String, Object> lockBody = Map.of("workerId", KAFKA_BRIDGE_WORKER_ID, "maxTasks", 50, "topics", topics);
        List<LockedExternalTask> locked = restClient.post()
                .uri(baseUrl + "/external-task/fetchAndLock")
                .contentType(MediaType.APPLICATION_JSON)
                .body(lockBody)
                .retrieve()
                .body(new ParameterizedTypeReference<List<LockedExternalTask>>() {
                });
        return locked != null ? locked : List.of();
    }

    /** Instância mais recente de uma definição de processo iniciada depois de {@code since} — usado
     * pelo polling do front depois de enviar uma mensagem de teste pra um MESSAGE_START_EVENT
     * (não existe processInstanceId nenhum antes disso pra consultar diretamente). */
    public Optional<String> findMostRecentInstanceStartedAfter(String processDefinitionKey, Instant since) {
        List<Map<String, Object>> found = restClient.get()
                .uri(baseUrl + "/history/process-instance?processDefinitionKey={key}&startedAfter={since}&sortBy=startTime&sortOrder=desc&maxResults=1",
                        processDefinitionKey, HISTORY_DATE_FORMAT.format(since))
                .retrieve()
                .body(new ParameterizedTypeReference<List<Map<String, Object>>>() {
                });
        if (found == null || found.isEmpty()) {
            return Optional.empty();
        }
        return Optional.ofNullable(found.get(0).get("id")).map(String::valueOf);
    }

    /** Todas as variáveis visíveis no escopo do processo agora — inclui tudo que outputMapping de
     * SERVICE_TASK/RECEIVE_TASK já escreveu, já que nossos fluxos nunca têm mais de uma execução
     * viva ao mesmo tempo (sem gateway paralelo/subprocesso/multi-instância). Uma instância já
     * terminada não existe mais nas tabelas de runtime (o Camunda as move pra história assim que o
     * processo chega no Fim) — testado ao vivo: pra uma instância terminada, este endpoint não
     * responde 404 nem um mapa vazio, e sim {@code 500 NullValueException} ("execution ... doesn't
     * exist: execution is null"). Por isso {@link #getRuntimeProcessVariables} engole QUALQUER
     * RestClientException (não só 404) — e o fallback pra {@link #getHistoricProcessVariables}
     * dispara sempre que o runtime vem vazio (erro OU mapa vazio de verdade, ex.: instância ativa
     * ainda sem nenhuma variável) — nesse segundo caso só custa uma chamada extra que também volta
     * vazia. */
    public Map<String, CamundaVariable> getProcessVariables(String processInstanceId) {
        Map<String, CamundaVariable> runtime = getRuntimeProcessVariables(processInstanceId);
        return runtime.isEmpty() ? getHistoricProcessVariables(processInstanceId) : runtime;
    }

    private Map<String, CamundaVariable> getRuntimeProcessVariables(String processInstanceId) {
        try {
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
        } catch (RestClientException e) {
            return Map.of();
        }
    }

    /** Último valor de cada variável que a instância já teve, resolvido pela API de história —
     * ao contrário do endpoint de runtime, existe pra instância em qualquer estado, ativa ou já
     * terminada. Filtrado ao escopo do processo (activityInstanceId == processInstanceId, convenção
     * do Camunda pra execução raiz): sem isso, esta consulta sem filtro de atividade também devolve
     * variáveis LOCAIS de nós específicos (ex.: url/method/headers/payload/response que
     * HttpConnectorDelegate grava por Service Task REST, ver {@link #getLocalVariablesForActivity})
     * misturadas no mesmo mapa por nome — nomes genéricos o bastante pra colidir com uma variável de
     * processo de verdade que o admin tenha criado com o mesmo nome. */
    public Map<String, CamundaVariable> getHistoricProcessVariables(String processInstanceId) {
        List<HistoricVariableInstance> list = restClient.get()
                .uri(baseUrl + "/history/variable-instance?processInstanceId={id}", processInstanceId)
                .retrieve()
                .body(new ParameterizedTypeReference<List<HistoricVariableInstance>>() {
                });
        if (list == null) {
            return Map.of();
        }
        Map<String, CamundaVariable> result = new java.util.LinkedHashMap<>();
        for (HistoricVariableInstance v : list) {
            if (!processInstanceId.equals(v.activityInstanceId())) {
                continue;
            }
            result.put(v.name(), new CamundaVariable(v.value(), v.type()));
        }
        return result;
    }

    /** Variáveis locais que existiram só no escopo de uma atividade específica (ex.: url/method/
     * headers/payload/response que HttpConnectorDelegate, em ms-runtime-camunda, grava via
     * camunda:inputOutput comum num Service Task REST) — ao contrário de {@link #getProcessVariables},
     * que só enxerga o que ainda está (ou ficou) visível no escopo do processo. Funciona pra qualquer
     * atividade já concluída, independente do processo ainda estar ativo ou já ter terminado, porque
     * consulta história, não runtime. */
    public Map<String, CamundaVariable> getLocalVariablesForActivity(String activityInstanceId) {
        List<HistoricVariableInstance> list = restClient.get()
                .uri(baseUrl + "/history/variable-instance?activityInstanceIdIn={id}", activityInstanceId)
                .retrieve()
                .body(new ParameterizedTypeReference<List<HistoricVariableInstance>>() {
                });
        if (list == null) {
            return Map.of();
        }
        Map<String, CamundaVariable> result = new java.util.LinkedHashMap<>();
        for (HistoricVariableInstance v : list) {
            result.put(v.name(), new CamundaVariable(v.value(), v.type()));
        }
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

    /** Encerra (mata) uma instância em execução — usado quando o usuário para a execução pela UI,
     * pra não deixar lixo na engine. skipCustomListeners/skipIoMappings é a forma recomendada do
     * Camunda de cancelar de fato, sem tentar rodar listeners pensados pro fluxo terminar
     * normalmente. 404 (a instância já tinha terminado sozinha nesse meio-tempo) não é erro aqui —
     * parar uma execução que já acabou é um no-op, não uma falha. */
    public void deleteProcessInstance(String processInstanceId) {
        try {
            restClient.delete()
                    .uri(baseUrl + "/process-instance/{id}?skipCustomListeners=true&skipIoMappings=true", processInstanceId)
                    .retrieve()
                    .toBodilessEntity();
        } catch (HttpClientErrorException.NotFound e) {
            // já não existe — objetivo alcançado
        }
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
