package com.jouney.admin.interfaces.dashboard;

import com.jouney.admin.domain.dashboard.IncidentSummary;
import java.time.Instant;

public record IncidentResponse(String id, String processInstanceId, String processDefinitionName, String activityId,
                                String incidentType, String message, Instant timestamp) {

    static IncidentResponse from(IncidentSummary i) {
        return new IncidentResponse(i.id(), i.processInstanceId(), i.processDefinitionName(), i.activityId(),
                i.incidentType(), i.message(), i.timestamp());
    }
}
