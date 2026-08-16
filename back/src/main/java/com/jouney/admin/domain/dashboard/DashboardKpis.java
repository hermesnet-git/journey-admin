package com.jouney.admin.domain.dashboard;

public record DashboardKpis(int runningInstances, int pendingTasks, int openIncidents, int deployedJourneys,
                             int completedToday) {
}
