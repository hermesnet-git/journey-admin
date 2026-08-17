package com.jouney.admin.application.dashboard;

import com.jouney.admin.domain.dashboard.DailyInstanceCount;
import com.jouney.admin.domain.dashboard.DashboardKpis;
import com.jouney.admin.domain.dashboard.DashboardOverview;
import com.jouney.admin.domain.dashboard.DashboardTrend;
import com.jouney.admin.domain.dashboard.HistoricInstanceSummary;
import com.jouney.admin.domain.dashboard.HourlyInstanceCount;
import com.jouney.admin.domain.dashboard.IncidentSummary;
import com.jouney.admin.domain.dashboard.ProcessDefinitionUsage;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

/** Monta o retrato agregado do Dashboard a partir de chamadas somente-leitura na porta de
 * monitoramento do runtime — sem estado próprio, sempre ao vivo no momento da chamada. */
@Component
public class GetDashboardOverview {

    private static final int TREND_FETCH_DAYS = 30;
    private static final int TREND_WEEK_DAYS = 7;
    private static final int TREND_MONTH_DAYS = 30;
    private static final int TREND_HOURS = 24;
    private static final int LIST_LIMIT = 25;

    private final RuntimeMonitoringPort monitoring;

    public GetDashboardOverview(RuntimeMonitoringPort monitoring) {
        this.monitoring = monitoring;
    }

    public DashboardOverview execute() {
        List<ProcessDefinitionUsage> rawUsage = monitoring.processDefinitionUsage();
        // Mapa id→nome a partir da lista NÃO agrupada — cobre toda versão implantada. Depois de
        // agrupar por chave só sobra o id da versão mais recente, então resolver contra o mapa
        // agrupado perderia o nome de incidentes/tarefas de instâncias em versões mais antigas.
        Map<String, String> nameByDefinitionId = rawUsage.stream()
                .collect(Collectors.toMap(ProcessDefinitionUsage::definitionId, ProcessDefinitionUsage::name, (a, b) -> a));
        List<ProcessDefinitionUsage> processDefinitions = groupByKey(rawUsage);

        ZoneId zone = ZoneId.systemDefault();
        Instant startOfToday = LocalDate.now(zone).atStartOfDay(zone).toInstant();
        Instant trendSince = LocalDate.now(zone).minusDays(TREND_FETCH_DAYS - 1L).atStartOfDay(zone).toInstant();

        DashboardKpis kpis = new DashboardKpis(
                monitoring.countRunningInstances(),
                monitoring.countPendingTasks(),
                monitoring.countOpenIncidents(),
                // Jornadas distintas implantadas (agrupado por chave, não por versão).
                processDefinitions.size(),
                monitoring.countInstancesFinishedSince(startOfToday));

        // Um único fetch de 30 dias alimenta as três granularidades — evita 3 idas ao motor de runtime.
        List<HistoricInstanceSummary> trendSource = monitoring.historicInstancesStartedSince(trendSince, 5000);
        DashboardTrend trend = new DashboardTrend(
                buildHourlyTrend(trendSource, zone),
                buildTrend(trendSource, zone, TREND_WEEK_DAYS),
                buildTrend(trendSource, zone, TREND_MONTH_DAYS));

        List<IncidentSummary> incidents = monitoring.recentIncidents(LIST_LIMIT).stream()
                .map(i -> i.withProcessDefinitionName(resolveName(i.processDefinitionId(), nameByDefinitionId)))
                .toList();

        return new DashboardOverview(kpis, processDefinitions, incidents,
                monitoring.oldestActiveInstances(LIST_LIMIT), monitoring.newestActiveInstances(LIST_LIMIT), trend);
    }

    private static String resolveName(String definitionId, Map<String, String> nameByDefinitionId) {
        return nameByDefinitionId.getOrDefault(definitionId, definitionId);
    }

    // Agrupa por chave (não por id de versão) somando instâncias/incidentes/jobs falhos entre todas
    // as versões — mesmo comportamento padrão do dashboard "Process Definitions" do Cockpit, e evita
    // uma linha por versão republicada.
    private static List<ProcessDefinitionUsage> groupByKey(List<ProcessDefinitionUsage> rawUsage) {
        Map<String, ProcessDefinitionUsage> byKey = new LinkedHashMap<>();
        for (ProcessDefinitionUsage usage : rawUsage) {
            byKey.merge(usage.key(), usage, GetDashboardOverview::mergeVersions);
        }
        return byKey.values().stream()
                .sorted(Comparator.comparingInt(ProcessDefinitionUsage::instances).reversed())
                .toList();
    }

    private static ProcessDefinitionUsage mergeVersions(ProcessDefinitionUsage a, ProcessDefinitionUsage b) {
        boolean bIsNewer = b.version() > a.version();
        return new ProcessDefinitionUsage(
                bIsNewer ? b.definitionId() : a.definitionId(),
                a.key(),
                bIsNewer ? b.name() : a.name(),
                Math.max(a.version(), b.version()),
                a.instances() + b.instances(),
                a.incidents() + b.incidents(),
                a.failedJobs() + b.failedJobs());
    }

    // Simplificação deliberada: "concluídas" é contado a partir do mesmo lote de instâncias
    // iniciadas na janela (bucket pelo dia do endTime) — uma instância iniciada antes da janela e
    // concluída dentro dela não entra nessa série. Suficiente pra um gráfico de tendência do
    // dashboard; não é uma ferramenta de auditoria.
    private static List<DailyInstanceCount> buildTrend(List<HistoricInstanceSummary> instances, ZoneId zone, int days) {
        Map<LocalDate, long[]> byDay = new TreeMap<>();
        LocalDate today = LocalDate.now(zone);
        for (int i = days - 1; i >= 0; i--) {
            byDay.put(today.minusDays(i), new long[2]);
        }
        for (HistoricInstanceSummary inst : instances) {
            LocalDate startDay = dayOf(inst.startTime(), zone);
            long[] startBucket = startDay != null ? byDay.get(startDay) : null;
            if (startBucket != null) startBucket[0]++;
            LocalDate endDay = dayOf(inst.endTime(), zone);
            long[] endBucket = endDay != null ? byDay.get(endDay) : null;
            if (endBucket != null) endBucket[1]++;
        }
        return byDay.entrySet().stream()
                .map(e -> new DailyInstanceCount(e.getKey(), e.getValue()[0], e.getValue()[1]))
                .toList();
    }

    // Mesma lógica de buildTrend, bucket por hora em vez de por dia — janela das últimas 24h.
    private static List<HourlyInstanceCount> buildHourlyTrend(List<HistoricInstanceSummary> instances, ZoneId zone) {
        Map<Instant, long[]> byHour = new TreeMap<>();
        Instant currentHour = Instant.now().truncatedTo(ChronoUnit.HOURS);
        for (int i = TREND_HOURS - 1; i >= 0; i--) {
            byHour.put(currentHour.minus(i, ChronoUnit.HOURS), new long[2]);
        }
        for (HistoricInstanceSummary inst : instances) {
            Instant startHour = hourOf(inst.startTime());
            long[] startBucket = startHour != null ? byHour.get(startHour) : null;
            if (startBucket != null) startBucket[0]++;
            Instant endHour = hourOf(inst.endTime());
            long[] endBucket = endHour != null ? byHour.get(endHour) : null;
            if (endBucket != null) endBucket[1]++;
        }
        return byHour.entrySet().stream()
                .map(e -> new HourlyInstanceCount(e.getKey(), e.getValue()[0], e.getValue()[1]))
                .toList();
    }

    private static Instant hourOf(Instant instant) {
        return instant != null ? instant.truncatedTo(ChronoUnit.HOURS) : null;
    }

    private static LocalDate dayOf(Instant instant, ZoneId zone) {
        return instant != null ? instant.atZone(zone).toLocalDate() : null;
    }
}
