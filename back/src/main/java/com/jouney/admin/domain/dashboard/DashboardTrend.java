package com.jouney.admin.domain.dashboard;

import java.util.List;

/** Três janelas pré-calculadas a partir do mesmo fetch de histórico (últimos 30 dias) — o front
 * troca de visão sem round-trip novo. {@code day}: últimas 24h, por hora. {@code week}/{@code month}:
 * últimos 7/30 dias, por dia. */
public record DashboardTrend(List<HourlyInstanceCount> day, List<DailyInstanceCount> week,
                              List<DailyInstanceCount> month) {
}
