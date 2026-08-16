package com.jouney.admin.domain.dashboard;

import java.time.Instant;

public record HistoricInstanceSummary(String id, String processDefinitionName, String businessKey, Instant startTime,
                                       Instant endTime, Long durationMillis, String state) {
}
