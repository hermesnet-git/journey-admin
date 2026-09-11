package com.jouney.admin.infrastructure.dashboard;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.jouney.admin.application.dashboard.RuntimeInstanceControlPort;
import com.jouney.admin.application.dashboard.RuntimeMonitoringPort;
import com.jouney.admin.application.execution.RuntimeExecutionPort;
import com.jouney.admin.domain.dashboard.HistoricInstanceSummary;
import com.jouney.admin.domain.dashboard.IncidentSummary;
import com.jouney.admin.domain.dashboard.ProcessDefinitionUsage;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Fala direto com a REST API do motor de runtime (engine-rest): consultas de monitoramento
 * agregadas pro Dashboard, o comando de encerrar uma instância abandonada, e — desde a migração da
 * funcionalidade de Execução pra dentro do admin/back — as ações de rodar uma instância passo a
 * passo (iniciar, consultar passo atual, completar tarefa). A resolução da tela em si continua no
 * ms-espec-registry (guardião do contrato SDUI, via {@code FormResolutionPort}); este adapter só
 * fala com o motor.
 */
@Component
class RuntimeEngineMonitoringAdapter implements RuntimeMonitoringPort, RuntimeInstanceControlPort, RuntimeExecutionPort {

    // O motor espera o formato RFC 822 ("+0000"), não o "Z" que Instant#toString produz.
    private static final DateTimeFormatter QUERY_DATE_FORMAT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSZ").withZone(ZoneOffset.UTC);

    private static final String EXTERNAL_TASK_WORKER_ID = "admin-back-execution";

    private final RestClient restClient;
    private final String baseUrl;
    private final org.springframework.kafka.core.KafkaTemplate<String, String> kafkaTemplate;

    RuntimeEngineMonitoringAdapter(@Value("${app.runtime-engine.base-url}") String baseUrl,
                                    org.springframework.kafka.core.KafkaTemplate<String, String> kafkaTemplate) {
        this.baseUrl = baseUrl;
        this.restClient = RestClient.create();
        this.kafkaTemplate = kafkaTemplate;
    }

    // Todo acesso ao engine-rest passa por aqui: se o motor de runtime estiver fora do ar (ou inacessível),
    // vira RuntimeMonitoringException em vez de deixar a exceção de rede crua propagar — o
    // GlobalExceptionHandler traduz isso numa mensagem única e amigável pro Dashboard.
    private <T> T call(Supplier<T> request) {
        try {
            return request.get();
        } catch (RestClientException e) {
            throw new RuntimeMonitoringException(
                    "Motor de runtime não encontrado ou está fora do ar. Contate o administrador do sistema.", e);
        }
    }

    @Override
    public List<ProcessDefinitionUsage> processDefinitionUsage() {
        List<StatisticsRaw> raw = call(() -> restClient.get()
                .uri(baseUrl + "/process-definition/statistics?includeIncidents=true")
                .retrieve()
                .body(new ParameterizedTypeReference<List<StatisticsRaw>>() {
                }));
        if (raw == null) return List.of();
        return raw.stream()
                .filter(r -> r.definition() != null)
                .map(r -> new ProcessDefinitionUsage(r.definition().id(), r.definition().key(),
                        displayName(r.definition().name(), r.definition().key()), r.definition().version(),
                        r.instances(), incidentCount(r), r.failedJobs()))
                .toList();
    }

    private static int incidentCount(StatisticsRaw r) {
        return r.incidents() == null ? 0 : r.incidents().stream().mapToInt(IncidentCountByType::incidentCount).sum();
    }

    @Override
    public int countRunningInstances() {
        return countFrom(baseUrl + "/process-instance/count");
    }

    @Override
    public int countPendingTasks() {
        return countFrom(baseUrl + "/task/count");
    }

    @Override
    public int countOpenIncidents() {
        return countFrom(baseUrl + "/incident/count");
    }

    @Override
    public int countInstancesFinishedSince(Instant since) {
        // Precisa ir por variável de template ({since}), não concatenado direto na string: o "+" do
        // offset (+0000) formatado é reinterpretado como espaço se embutido cru na URI.
        return countFrom(baseUrl + "/history/process-instance/count?finishedAfter={since}", QUERY_DATE_FORMAT.format(since));
    }

    private int countFrom(String uriTemplate, Object... uriVariables) {
        Map<String, Object> response = call(() -> restClient.get()
                .uri(uriTemplate, uriVariables)
                .retrieve()
                .body(new ParameterizedTypeReference<Map<String, Object>>() {
                }));
        Object count = response != null ? response.get("count") : null;
        return count instanceof Number n ? n.intValue() : 0;
    }

    @Override
    public List<IncidentSummary> recentIncidents(int limit) {
        List<IncidentRaw> raw = call(() -> restClient.get()
                .uri(baseUrl + "/incident?maxResults={n}&sortBy=incidentTimestamp&sortOrder=desc", limit)
                .retrieve()
                .body(new ParameterizedTypeReference<List<IncidentRaw>>() {
                }));
        if (raw == null) return List.of();
        return raw.stream()
                .map(i -> new IncidentSummary(i.id(), i.processInstanceId(), i.processDefinitionId(), null,
                        i.activityId(), i.incidentType(), i.incidentMessage(), parseInstant(i.incidentTimestamp())))
                .toList();
    }

    @Override
    public List<HistoricInstanceSummary> oldestActiveInstances(int limit) {
        return fetchHistoricInstances(baseUrl + "/history/process-instance?unfinished=true&maxResults={n}&sortBy=startTime&sortOrder=asc", limit);
    }

    @Override
    public List<HistoricInstanceSummary> newestActiveInstances(int limit) {
        return fetchHistoricInstances(baseUrl + "/history/process-instance?unfinished=true&maxResults={n}&sortBy=startTime&sortOrder=desc", limit);
    }

    @Override
    public List<HistoricInstanceSummary> historicInstancesStartedSince(Instant since, int limit) {
        return fetchHistoricInstances(
                baseUrl + "/history/process-instance?startedAfter={since}&maxResults={n}&sortBy=startTime&sortOrder=asc",
                QUERY_DATE_FORMAT.format(since), limit);
    }

    @Override
    public List<HistoricInstanceSummary> recentInstances(int limit) {
        List<HistoricProcessInstanceRaw> raw = call(() -> restClient.get()
                .uri(baseUrl + "/history/process-instance?maxResults={n}&sortBy=startTime&sortOrder=desc", limit)
                .retrieve()
                .body(new ParameterizedTypeReference<List<HistoricProcessInstanceRaw>>() {
                }));
        if (raw == null) return List.of();
        Map<String, String> channels = fetchChannels(raw.stream().map(HistoricProcessInstanceRaw::id).toList());
        return raw.stream().map(p -> toSummary(p, channels.get(p.id()))).toList();
    }

    /** Canal ({@code channel}, variável de processo gravada no start da instância) de cada id da
     * lista, numa única chamada em lote — só usado pelo card "Execuções recentes" do Dashboard, que
     * é a única lista deste adapter que expõe canal por instância (ver javadoc de
     * {@link HistoricInstanceSummary}). */
    private Map<String, String> fetchChannels(List<String> processInstanceIds) {
        if (processInstanceIds.isEmpty()) {
            return Map.of();
        }
        List<HistoricVariableRaw> raw = call(() -> restClient.get()
                .uri(baseUrl + "/history/variable-instance?variableName=channel&processInstanceIdIn={ids}",
                        String.join(",", processInstanceIds))
                .retrieve()
                .body(new ParameterizedTypeReference<List<HistoricVariableRaw>>() {
                }));
        if (raw == null) return Map.of();
        Map<String, String> result = new java.util.LinkedHashMap<>();
        for (HistoricVariableRaw v : raw) {
            if (v.value() != null) {
                result.put(v.processInstanceId(), String.valueOf(v.value()));
            }
        }
        return result;
    }

    // 404 aqui é "esse id não existe" (usuário pode ter digitado um businessKey, não um
    // processInstanceId), não "motor fora do ar" — trata antes de cair no call() genérico, que
    // rewrapearia qualquer RestClientException (incluindo NotFound) como RuntimeMonitoringException
    // com a mensagem errada.
    @Override
    public Optional<HistoricInstanceSummary> findInstance(String idOrBusinessKey) {
        try {
            HistoricProcessInstanceRaw raw = restClient.get()
                    .uri(baseUrl + "/history/process-instance/{id}", idOrBusinessKey)
                    .retrieve()
                    .body(HistoricProcessInstanceRaw.class);
            if (raw != null) {
                return Optional.of(toSummary(raw, fetchChannels(List.of(raw.id())).get(raw.id())));
            }
        } catch (HttpClientErrorException.NotFound e) {
            // Não é um processInstanceId válido — tenta como businessKey abaixo.
        } catch (RestClientException e) {
            throw new RuntimeMonitoringException(
                    "Motor de runtime não encontrado ou está fora do ar. Contate o administrador do sistema.", e);
        }
        return findByBusinessKey(idOrBusinessKey);
    }

    // businessKey como query param é ignorado silenciosamente por este motor — confirmado ao vivo
    // (mesma armadilha documentada em ms-espec-registry/CamundaClient#searchHistoricInstances):
    // qualquer valor, válido ou inventado, devolve a lista inteira sem filtrar. Por isso filtra em
    // memória sobre um lote razoável, mais recentes primeiro (só roda quando a busca por id direto já
    // deu 404, então o custo extra é aceitável — não é um caminho chamado a cada refresh do overview).
    private Optional<HistoricInstanceSummary> findByBusinessKey(String businessKey) {
        List<HistoricProcessInstanceRaw> raw = call(() -> restClient.get()
                .uri(baseUrl + "/history/process-instance?maxResults=500&sortBy=startTime&sortOrder=desc")
                .retrieve()
                .body(new ParameterizedTypeReference<List<HistoricProcessInstanceRaw>>() {
                }));
        if (raw == null) {
            return Optional.empty();
        }
        Optional<HistoricProcessInstanceRaw> found = raw.stream()
                .filter(p -> businessKey.equals(p.businessKey()))
                .findFirst();
        return found.map(p -> toSummary(p, fetchChannels(List.of(p.id())).get(p.id())));
    }

    private List<HistoricInstanceSummary> fetchHistoricInstances(String uriTemplate, Object... uriVariables) {
        List<HistoricProcessInstanceRaw> raw = call(() -> restClient.get()
                .uri(uriTemplate, uriVariables)
                .retrieve()
                .body(new ParameterizedTypeReference<List<HistoricProcessInstanceRaw>>() {
                }));
        if (raw == null) return List.of();
        return raw.stream().map(p -> toSummary(p, null)).toList();
    }

    private static HistoricInstanceSummary toSummary(HistoricProcessInstanceRaw p, String channel) {
        return new HistoricInstanceSummary(p.id(), displayName(p.processDefinitionName(), p.processDefinitionKey()),
                p.businessKey(), parseInstant(p.startTime()), parseInstant(p.endTime()), p.durationInMillis(), p.state(),
                channel);
    }

    // --- RuntimeExecutionPort ---

    // Sem o wrapper call() abaixo pra baixo: start/completeTask podem falhar por um motivo de
    // negócio real (conector síncrono que falhou, transação com rollback), não só "motor fora do
    // ar" — RestClientException crua precisa chegar ao chamador (StartExecution/CompleteExecutionTask)
    // pra virar uma mensagem de erro útil, não o texto genérico de indisponibilidade do call().

    @Override
    public String startProcessInstance(String processDefinitionKey, Map<String, Object> variables, String businessKey) {
        Map<String, Object> body = Map.of("variables", wrapValues(variables), "businessKey", businessKey);
        Map<String, Object> response = restClient.post()
                .uri(baseUrl + "/process-definition/key/{key}/start", processDefinitionKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(new ParameterizedTypeReference<Map<String, Object>>() {
                });
        return String.valueOf(response.get("id"));
    }

    @Override
    public Optional<ProcessInstance> getProcessInstance(String processInstanceId) {
        try {
            ProcessInstanceRaw raw = restClient.get()
                    .uri(baseUrl + "/process-instance/{id}", processInstanceId)
                    .retrieve()
                    .body(ProcessInstanceRaw.class);
            return Optional.ofNullable(raw)
                    .map(r -> new ProcessInstance(r.id(), r.definitionKey(), r.definitionId(), r.businessKey()));
        } catch (HttpClientErrorException.NotFound e) {
            return Optional.empty();
        } catch (RestClientException e) {
            throw new RuntimeMonitoringException(
                    "Motor de runtime não encontrado ou está fora do ar. Contate o administrador do sistema.", e);
        }
    }

    @Override
    public String getVersionTag(String processDefinitionId) {
        Map<String, Object> definition = call(() -> restClient.get()
                .uri(baseUrl + "/process-definition/{id}", processDefinitionId)
                .retrieve()
                .body(new ParameterizedTypeReference<Map<String, Object>>() {
                }));
        Object tag = definition != null ? definition.get("versionTag") : null;
        if (!(tag instanceof String value) || !value.startsWith("v")) {
            throw new RuntimeMonitoringException("Definição do runtime sem versão de jornada válida", null);
        }
        return value;
    }

    @Override
    public List<ActiveTask> findActiveUserTasks(String processInstanceId) {
        List<ActiveTaskRaw> raw = call(() -> restClient.get()
                .uri(baseUrl + "/task?processInstanceId={id}", processInstanceId)
                .retrieve()
                .body(new ParameterizedTypeReference<List<ActiveTaskRaw>>() {
                }));
        if (raw == null) return List.of();
        return raw.stream().map(r -> new ActiveTask(r.id(), r.name(), r.taskDefinitionKey())).toList();
    }

    @Override
    public Optional<LeafActivity> findLeafActivity(String processInstanceId) {
        try {
            ActivityInstanceNodeRaw root = restClient.get()
                    .uri(baseUrl + "/process-instance/{id}/activity-instances", processInstanceId)
                    .retrieve()
                    .body(ActivityInstanceNodeRaw.class);
            return Optional.ofNullable(root).map(RuntimeEngineMonitoringAdapter::leafOf)
                    .map(n -> new LeafActivity(n.activityId(), n.activityType(), n.activityName()));
        } catch (HttpClientErrorException.NotFound e) {
            return Optional.empty();
        } catch (RestClientException e) {
            throw new RuntimeMonitoringException(
                    "Motor de runtime não encontrado ou está fora do ar. Contate o administrador do sistema.", e);
        }
    }

    private static ActivityInstanceNodeRaw leafOf(ActivityInstanceNodeRaw node) {
        List<ActivityInstanceNodeRaw> children = node.childActivityInstances();
        if (children == null || children.isEmpty()) {
            return node;
        }
        return leafOf(children.get(0));
    }

    @Override
    public Map<String, Object> getProcessVariables(String processInstanceId) {
        Map<String, Map<String, Object>> raw = call(() -> restClient.get()
                .uri(baseUrl + "/process-instance/{id}/variables", processInstanceId)
                .retrieve()
                .body(new ParameterizedTypeReference<Map<String, Map<String, Object>>>() {
                }));
        Map<String, Object> result = new LinkedHashMap<>();
        if (raw != null) {
            raw.forEach((name, v) -> result.put(name, v.get("value")));
        }
        return result;
    }

    @Override
    public void completeTask(String taskId, Map<String, Object> variables) {
        restClient.post()
                .uri(baseUrl + "/task/{id}/complete", taskId)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("variables", wrapValues(variables)))
                .retrieve()
                .toBodilessEntity();
    }

    @Override
    public void correlateMessage(String messageName, String processInstanceId, Map<String, Object> variables) {
        restClient.post()
                .uri(baseUrl + "/message")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("messageName", messageName, "processInstanceId", processInstanceId,
                        "processVariables", wrapValues(variables)))
                .retrieve()
                .toBodilessEntity();
    }

    // Camunda espera {"value": ...} por variável (type é opcional — sem ele, o motor infere do
    // JSON); Collections.singletonMap (não Map.of) porque um valor de resposta pode ser null.
    private static Map<String, Object> wrapValues(Map<String, Object> variables) {
        Map<String, Object> wrapped = new LinkedHashMap<>();
        variables.forEach((name, value) -> wrapped.put(name, Collections.singletonMap("value", value)));
        return wrapped;
    }

    @Override
    public List<ActivityHistoryEntry> getActivityHistorySince(String processInstanceId, Instant since) {
        List<ActivityInstanceHistoryRaw> raw = call(() -> restClient.get()
                .uri(baseUrl + "/history/activity-instance?processInstanceId={id}&finishedAfter={since}&sortBy=startTime&sortOrder=asc",
                        processInstanceId, QUERY_DATE_FORMAT.format(since))
                .retrieve()
                .body(new ParameterizedTypeReference<List<ActivityInstanceHistoryRaw>>() {
                }));
        if (raw == null) return List.of();
        return raw.stream().map(r -> new ActivityHistoryEntry(r.id(), r.activityId(), r.activityName(), r.activityType(), r.startTime(), r.endTime(), r.durationInMillis())).toList();
    }

    @Override
    public Map<String, Object> getLocalVariablesForActivity(String activityInstanceId) {
        List<HistoricVariableInstanceRaw> raw = call(() -> restClient.get()
                .uri(baseUrl + "/history/variable-instance?activityInstanceIdIn={id}", activityInstanceId)
                .retrieve()
                .body(new ParameterizedTypeReference<List<HistoricVariableInstanceRaw>>() {
                }));
        Map<String, Object> result = new LinkedHashMap<>();
        if (raw != null) {
            raw.forEach(v -> result.put(v.name(), v.value()));
        }
        return result;
    }

    @Override
    public Map<String, TypedVariable> getTypedProcessVariables(String processInstanceId) {
        Map<String, Map<String, Object>> raw = call(() -> restClient.get()
                .uri(baseUrl + "/process-instance/{id}/variables", processInstanceId)
                .retrieve()
                .body(new ParameterizedTypeReference<Map<String, Map<String, Object>>>() {
                }));
        Map<String, TypedVariable> result = new LinkedHashMap<>();
        if (raw != null) {
            raw.forEach((name, v) -> result.put(name, new TypedVariable(v.get("value"), String.valueOf(v.get("type")))));
        }
        return result;
    }

    @Override
    public void setProcessVariable(String processInstanceId, String name, Object value, String type) {
        call(() -> restClient.put()
                .uri(baseUrl + "/process-instance/{id}/variables/{name}", processInstanceId, name)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("value", value, "type", type))
                .retrieve()
                .toBodilessEntity());
    }

    // --- Diagnóstico (histórico) ---

    @Override
    public List<HistoricInstance> searchHistoricInstances(String processDefinitionKey, String businessKey,
                                                            Instant startedFrom, Instant startedTo, Boolean finished, int maxResults) {
        StringBuilder uri = new StringBuilder(baseUrl
                + "/history/process-instance?sortBy=startTime&sortOrder=desc&maxResults=" + maxResults);
        List<Object> vars = new ArrayList<>();
        if (processDefinitionKey != null) {
            uri.append("&processDefinitionKeyIn={pdk}");
            vars.add(processDefinitionKey);
        }
        if (startedFrom != null) {
            uri.append("&startedAfter={from}");
            vars.add(QUERY_DATE_FORMAT.format(startedFrom));
        }
        if (startedTo != null) {
            uri.append("&startedBefore={to}");
            vars.add(QUERY_DATE_FORMAT.format(startedTo));
        }
        if (finished != null) {
            uri.append(finished ? "&finished=true" : "&unfinished=true");
        }
        List<HistoricInstanceRaw> found = call(() -> restClient.get()
                .uri(uri.toString(), vars.toArray())
                .retrieve()
                .body(new ParameterizedTypeReference<List<HistoricInstanceRaw>>() {
                }));
        if (found == null) return List.of();
        return found.stream()
                .filter(p -> businessKey == null || businessKey.equals(p.businessKey()))
                .map(RuntimeEngineMonitoringAdapter::toHistoricInstance)
                .toList();
    }

    @Override
    public Optional<HistoricInstance> getHistoricProcessInstance(String processInstanceId) {
        try {
            HistoricInstanceRaw raw = restClient.get()
                    .uri(baseUrl + "/history/process-instance/{id}", processInstanceId)
                    .retrieve()
                    .body(HistoricInstanceRaw.class);
            return Optional.ofNullable(raw).map(RuntimeEngineMonitoringAdapter::toHistoricInstance);
        } catch (HttpClientErrorException.NotFound e) {
            return Optional.empty();
        } catch (RestClientException e) {
            throw new RuntimeMonitoringException(
                    "Motor de runtime não encontrado ou está fora do ar. Contate o administrador do sistema.", e);
        }
    }

    @Override
    public Map<String, String> getChannelsForInstances(Collection<String> processInstanceIds) {
        return fetchChannels(List.copyOf(processInstanceIds));
    }

    @Override
    public List<ActivityHistoryEntry> getFullActivityHistory(String processInstanceId) {
        List<ActivityInstanceHistoryRaw> raw = call(() -> restClient.get()
                .uri(baseUrl + "/history/activity-instance?processInstanceId={id}&sortBy=startTime&sortOrder=asc",
                        processInstanceId)
                .retrieve()
                .body(new ParameterizedTypeReference<List<ActivityInstanceHistoryRaw>>() {
                }));
        if (raw == null) return List.of();
        return raw.stream().map(r -> new ActivityHistoryEntry(r.id(), r.activityId(), r.activityName(), r.activityType(), r.startTime(), r.endTime(), r.durationInMillis())).toList();
    }

    @Override
    public Map<String, Object> getSubmittedFormValues(String activityInstanceId) {
        List<Map<String, Object>> details = call(() -> restClient.get()
                .uri(baseUrl + "/history/detail?activityInstanceId={id}&type=variableUpdate", activityInstanceId)
                .retrieve()
                .body(new ParameterizedTypeReference<List<Map<String, Object>>>() {
                }));
        Map<String, Object> result = new LinkedHashMap<>();
        if (details != null) {
            for (Map<String, Object> detail : details) {
                Object name = detail.get("variableName");
                if (name != null) {
                    result.put(String.valueOf(name), detail.get("value"));
                }
            }
        }
        return result;
    }

    @Override
    public void completeExternalTask(String processInstanceId, String activityId, Map<String, Object> variables) {
        List<ExternalTaskRaw> pending = call(() -> restClient.get()
                .uri(baseUrl + "/external-task?processInstanceId={pid}&activityId={aid}", processInstanceId, activityId)
                .retrieve()
                .body(new ParameterizedTypeReference<List<ExternalTaskRaw>>() {
                }));
        if (pending == null || pending.isEmpty()) {
            throw new IllegalStateException(
                    "Nenhum external task pendente para a atividade " + activityId + " na instância " + processInstanceId);
        }
        String topicName = pending.get(0).topicName();

        Map<String, Object> lockBody = Map.of(
                "workerId", EXTERNAL_TASK_WORKER_ID,
                "maxTasks", 1,
                "topics", List.of(Map.of(
                        "topicName", topicName,
                        "lockDuration", 30000,
                        "processInstanceIdIn", List.of(processInstanceId))));
        List<Map<String, Object>> locked = call(() -> restClient.post()
                .uri(baseUrl + "/external-task/fetchAndLock")
                .contentType(MediaType.APPLICATION_JSON)
                .body(lockBody)
                .retrieve()
                .body(new ParameterizedTypeReference<List<Map<String, Object>>>() {
                }));
        if (locked == null || locked.isEmpty()) {
            throw new IllegalStateException("Não foi possível travar o external task da atividade " + activityId);
        }
        String externalTaskId = String.valueOf(locked.get(0).get("id"));
        restClient.post()
                .uri(baseUrl + "/external-task/{id}/complete", externalTaskId)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("workerId", EXTERNAL_TASK_WORKER_ID, "variables", wrapValues(variables)))
                .retrieve()
                .toBodilessEntity();
    }

    @Override
    public void publishKafkaMessage(String topic, String key, String payloadJson, Map<String, String> headers) {
        org.apache.kafka.clients.producer.ProducerRecord<String, String> record =
                new org.apache.kafka.clients.producer.ProducerRecord<>(topic, key, payloadJson);
        if (headers != null) {
            headers.forEach((k, v) -> record.headers().add(k, v.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        }
        try {
            kafkaTemplate.send(record).get(5, java.util.concurrent.TimeUnit.SECONDS);
        } catch (Exception e) {
            throw new IllegalStateException("Falha ao publicar mensagem Kafka: " + e.getMessage(), e);
        }
    }

    @Override
    public Optional<String> findMostRecentInstanceStartedAfter(String processDefinitionKey, Instant since) {
        List<Map<String, Object>> found = call(() -> restClient.get()
                .uri(baseUrl + "/history/process-instance?processDefinitionKey={key}&startedAfter={since}&sortBy=startTime&sortOrder=desc&maxResults=1",
                        processDefinitionKey, QUERY_DATE_FORMAT.format(since))
                .retrieve()
                .body(new ParameterizedTypeReference<List<Map<String, Object>>>() {
                }));
        if (found == null || found.isEmpty()) {
            return Optional.empty();
        }
        return Optional.ofNullable(found.get(0).get("id")).map(String::valueOf);
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record ExternalTaskRaw(String id, String topicName) {
    }

    private static HistoricInstance toHistoricInstance(HistoricInstanceRaw r) {
        return new HistoricInstance(r.id(), r.businessKey(), r.processDefinitionId(), r.processDefinitionKey(),
                r.processDefinitionName(), r.processDefinitionVersion(), r.startTime(), r.endTime(),
                r.durationInMillis(), r.state());
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record HistoricInstanceRaw(String id, String businessKey, String processDefinitionId,
                                        String processDefinitionKey, String processDefinitionName,
                                        Integer processDefinitionVersion, String startTime, String endTime,
                                        Long durationInMillis, String state) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record ProcessInstanceRaw(String id, String definitionKey, String definitionId, String businessKey) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record ActivityInstanceHistoryRaw(String id, String activityId, String activityName, String activityType,
                                               String startTime, String endTime, Long durationInMillis) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record HistoricVariableInstanceRaw(String name, Object value) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record ActiveTaskRaw(String id, String name, String taskDefinitionKey) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record ActivityInstanceNodeRaw(String activityId, String activityType, String activityName,
                                            List<ActivityInstanceNodeRaw> childActivityInstances) {
    }

    @Override
    public void terminate(String processInstanceId) {
        // skipCustomListeners/skipIoMappings: uma instância abandonada pode estar num estado
        // inconsistente pro fluxo normal de listeners/mapeamentos rodar de novo — encerrar deve
        // funcionar mesmo assim, é justamente o mecanismo de descarte de última instância.
        call(() -> restClient.delete()
                .uri(baseUrl + "/process-instance/{id}?skipCustomListeners=true&skipIoMappings=true", processInstanceId)
                .retrieve()
                .toBodilessEntity());
    }

    private static String displayName(String name, String fallback) {
        return name != null && !name.isBlank() ? name : fallback;
    }

    private static Instant parseInstant(String engineTimestamp) {
        // O motor devolve "2026-08-16T02:39:13.925-0300" (offset sem ":"), que OffsetDateTime só
        // aceita com o padrão explícito abaixo (o formato ISO padrão exige "-03:00").
        if (engineTimestamp == null) return null;
        return OffsetDateTime.parse(engineTimestamp, DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSZ")).toInstant();
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record StatisticsRaw(String id, int instances, int failedJobs, List<IncidentCountByType> incidents,
                                  DefinitionRaw definition) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record IncidentCountByType(String incidentType, int incidentCount) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record DefinitionRaw(String id, String key, String name, int version) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record IncidentRaw(String id, String processDefinitionId, String processInstanceId, String activityId,
                                String incidentType, String incidentMessage, String incidentTimestamp) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record HistoricProcessInstanceRaw(String id, String businessKey, String processDefinitionKey,
                                               String processDefinitionName, String startTime, String endTime,
                                               Long durationInMillis, String state) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record HistoricVariableRaw(Object value, String processInstanceId) {
    }
}
