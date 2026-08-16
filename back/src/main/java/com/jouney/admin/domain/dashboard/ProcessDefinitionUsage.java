package com.jouney.admin.domain.dashboard;

/** Uma linha por definição de processo implantada no runtime, com sua contagem de
 * instâncias/incidentes/jobs falhos — antes de agrupar por chave (ver {@link DashboardOverview}). */
public record ProcessDefinitionUsage(String definitionId, String key, String name, int version, int instances,
                                      int incidents, int failedJobs) {
}
