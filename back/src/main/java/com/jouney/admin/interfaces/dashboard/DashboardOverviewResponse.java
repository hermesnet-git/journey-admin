package com.jouney.admin.interfaces.dashboard;

import com.jouney.admin.domain.dashboard.DashboardOverview;
import java.util.List;

public record DashboardOverviewResponse(DashboardKpisResponse kpis, List<ProcessDefinitionUsageResponse> processDefinitions,
                                         List<IncidentResponse> incidents, List<InstanceResponse> pendingInstances,
                                         List<InstanceResponse> executingRecently, DashboardTrendResponse trend) {

    static DashboardOverviewResponse from(DashboardOverview overview) {
        return new DashboardOverviewResponse(
                DashboardKpisResponse.from(overview.kpis()),
                overview.processDefinitions().stream().map(ProcessDefinitionUsageResponse::from).toList(),
                overview.incidents().stream().map(IncidentResponse::from).toList(),
                overview.pendingInstances().stream().map(InstanceResponse::from).toList(),
                overview.executingRecently().stream().map(InstanceResponse::from).toList(),
                DashboardTrendResponse.from(overview.trend()));
    }
}
