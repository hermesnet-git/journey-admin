package com.jouney.admin.domain.dashboard;

import java.util.List;

/** Retrato ao vivo do motor de runtime, montado sob demanda a cada chamada — sem persistência
 * própria, sem cache. {@code processDefinitions} já vem agrupado por chave (todas as versões
 * somadas), mesmo comportamento padrão do dashboard "Process Definitions" do Cockpit.
 * {@code pendingInstances} (mais antigas primeiro) e {@code executingRecently} (mais novas
 * primeiro) são o mesmo tipo de dado, só ordenado ao contrário — a primeira lista serve pra achar
 * candidatas a abandonadas, a segunda pra acompanhar o que está rodando agora. {@code recentInstances}
 * é diferente das outras duas: não filtra só ativas, é literalmente as últimas N de qualquer estado —
 * alimenta o card que linka pra Execução & Diagnóstico. */
public record DashboardOverview(DashboardKpis kpis, List<ProcessDefinitionUsage> processDefinitions,
                                 List<IncidentSummary> incidents, List<HistoricInstanceSummary> pendingInstances,
                                 List<HistoricInstanceSummary> executingRecently,
                                 List<HistoricInstanceSummary> recentInstances, DashboardTrend trend) {
}
