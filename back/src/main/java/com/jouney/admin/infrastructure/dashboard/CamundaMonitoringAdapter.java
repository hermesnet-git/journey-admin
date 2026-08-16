package com.jouney.admin.infrastructure.dashboard;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.jouney.admin.application.dashboard.RuntimeInstanceControlPort;
import com.jouney.admin.application.dashboard.RuntimeMonitoringPort;
import com.jouney.admin.domain.dashboard.HistoricInstanceSummary;
import com.jouney.admin.domain.dashboard.IncidentSummary;
import com.jouney.admin.domain.dashboard.ProcessDefinitionUsage;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Fala direto com a REST API do Camunda 7 (engine-rest): consultas de monitoramento e o comando de
 * encerrar uma instância abandonada. Serviço à parte do {@code ms-espec-registry}: aquele é
 * específico da funcionalidade de Simulação (iniciar/completar tarefas de uma instância); este é o
 * monitoramento geral do runtime que alimenta o Dashboard do portal.
 */
@Component
class CamundaMonitoringAdapter implements RuntimeMonitoringPort, RuntimeInstanceControlPort {

    // Camunda espera o formato RFC 822 ("+0000"), não o "Z" que Instant#toString produz.
    private static final DateTimeFormatter QUERY_DATE_FORMAT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSZ").withZone(ZoneOffset.UTC);

    private final RestClient restClient;
    private final String baseUrl;

    CamundaMonitoringAdapter(@Value("${app.camunda.base-url}") String baseUrl) {
        this.baseUrl = baseUrl;
        this.restClient = RestClient.create();
    }

    @Override
    public List<ProcessDefinitionUsage> processDefinitionUsage() {
        List<StatisticsRaw> raw = restClient.get()
                .uri(baseUrl + "/process-definition/statistics?includeIncidents=true")
                .retrieve()
                .body(new ParameterizedTypeReference<List<StatisticsRaw>>() {
                });
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
        Map<String, Object> response = restClient.get()
                .uri(uriTemplate, uriVariables)
                .retrieve()
                .body(new ParameterizedTypeReference<Map<String, Object>>() {
                });
        Object count = response != null ? response.get("count") : null;
        return count instanceof Number n ? n.intValue() : 0;
    }

    @Override
    public List<IncidentSummary> recentIncidents(int limit) {
        List<IncidentRaw> raw = restClient.get()
                .uri(baseUrl + "/incident?maxResults={n}&sortBy=incidentTimestamp&sortOrder=desc", limit)
                .retrieve()
                .body(new ParameterizedTypeReference<List<IncidentRaw>>() {
                });
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

    private List<HistoricInstanceSummary> fetchHistoricInstances(String uriTemplate, Object... uriVariables) {
        List<HistoricProcessInstanceRaw> raw = restClient.get()
                .uri(uriTemplate, uriVariables)
                .retrieve()
                .body(new ParameterizedTypeReference<List<HistoricProcessInstanceRaw>>() {
                });
        if (raw == null) return List.of();
        return raw.stream()
                .map(p -> new HistoricInstanceSummary(p.id(), displayName(p.processDefinitionName(), p.processDefinitionKey()),
                        p.businessKey(), parseInstant(p.startTime()), parseInstant(p.endTime()), p.durationInMillis(), p.state()))
                .toList();
    }

    @Override
    public void terminate(String processInstanceId) {
        // skipCustomListeners/skipIoMappings: uma instância abandonada pode estar num estado
        // inconsistente pro fluxo normal de listeners/mapeamentos rodar de novo — encerrar deve
        // funcionar mesmo assim, é justamente o mecanismo de descarte de última instância.
        restClient.delete()
                .uri(baseUrl + "/process-instance/{id}?skipCustomListeners=true&skipIoMappings=true", processInstanceId)
                .retrieve()
                .toBodilessEntity();
    }

    private static String displayName(String name, String fallback) {
        return name != null && !name.isBlank() ? name : fallback;
    }

    private static Instant parseInstant(String camundaTimestamp) {
        // Camunda devolve "2026-08-16T02:39:13.925-0300" (offset sem ":"), que OffsetDateTime só
        // aceita com o padrão explícito abaixo (o formato ISO padrão exige "-03:00").
        if (camundaTimestamp == null) return null;
        return OffsetDateTime.parse(camundaTimestamp, DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSZ")).toInstant();
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
}
