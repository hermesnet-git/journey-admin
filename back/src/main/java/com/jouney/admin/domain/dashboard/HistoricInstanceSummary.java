package com.jouney.admin.domain.dashboard;

import java.time.Instant;

/** {@code channel} só é resolvido nas consultas por trás do card "Execuções recentes" do Dashboard
 * (recentInstances/findInstance) — vem {@code null} nas demais listas deste tipo, que não precisam
 * dele. */
public record HistoricInstanceSummary(String id, String processDefinitionName, String businessKey, Instant startTime,
                                       Instant endTime, Long durationMillis, String state, String channel) {
}
