package com.jouney.admin.application.dashboard;

import com.jouney.admin.domain.dashboard.HistoricInstanceSummary;
import com.jouney.admin.domain.dashboard.IncidentSummary;
import com.jouney.admin.domain.dashboard.ProcessDefinitionUsage;
import java.time.Instant;
import java.util.List;

/** Leitura somente-consulta do estado ao vivo do motor de runtime. O Admin Portal não sabe qual
 * motor implementa isso — só o vocabulário de monitoramento, no mesmo espírito de
 * {@link com.jouney.admin.application.publication.RuntimePublicationPort} para a publicação. */
public interface RuntimeMonitoringPort {

    /** Uma linha por definição de processo implantada (todas as versões) — o caller agrupa por
     * chave se quiser um total por jornada. */
    List<ProcessDefinitionUsage> processDefinitionUsage();

    int countRunningInstances();

    int countPendingTasks();

    int countOpenIncidents();

    int countInstancesFinishedSince(Instant since);

    List<IncidentSummary> recentIncidents(int limit);

    /** Instâncias ativas, das mais antigas para as mais novas — candidatas a abandonadas (painel
     * "Instâncias pendentes", com opção de encerramento forçado). */
    List<HistoricInstanceSummary> oldestActiveInstances(int limit);

    /** Instâncias ativas, das mais novas para as mais antigas — o que está em execução agora
     * (painel "Executando recentemente"). */
    List<HistoricInstanceSummary> newestActiveInstances(int limit);

    /** Janela usada para montar a tendência diária (iniciadas/concluídas) — um único fetch coberto
     * por {@code since}, agrupado por dia pelo caller em vez de N consultas de contagem por dia. */
    List<HistoricInstanceSummary> historicInstancesStartedSince(Instant since, int limit);
}
