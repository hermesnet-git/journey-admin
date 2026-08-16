package com.jouney.admin.domain.dashboard;

import java.time.Instant;

/** {@code processDefinitionName} começa nulo (o adapter só conhece o id) e é preenchido por
 * {@link com.jouney.admin.application.dashboard.GetDashboardOverview}, que já tem o mapa
 * id→nome completo (todas as versões, não só a agrupada) no momento de montar o retrato final. */
public record IncidentSummary(String id, String processInstanceId, String processDefinitionId,
                               String processDefinitionName, String activityId, String incidentType, String message,
                               Instant timestamp) {

    public IncidentSummary withProcessDefinitionName(String name) {
        return new IncidentSummary(id, processInstanceId, processDefinitionId, name, activityId, incidentType,
                message, timestamp);
    }
}
