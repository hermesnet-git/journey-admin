package com.jouney.admin.interfaces.dashboard;

import com.jouney.admin.domain.dashboard.DashboardKpis;

public record DashboardKpisResponse(int runningInstances, int pendingTasks, int openIncidents, int deployedJourneys,
                                     int completedToday) {

    static DashboardKpisResponse from(DashboardKpis kpis) {
        return new DashboardKpisResponse(kpis.runningInstances(), kpis.pendingTasks(), kpis.openIncidents(),
                kpis.deployedJourneys(), kpis.completedToday());
    }
}
