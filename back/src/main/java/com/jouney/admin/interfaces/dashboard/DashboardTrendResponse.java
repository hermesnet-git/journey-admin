package com.jouney.admin.interfaces.dashboard;

import com.jouney.admin.domain.dashboard.DashboardTrend;
import java.util.List;

public record DashboardTrendResponse(List<HourlyInstanceCountResponse> day, List<DailyInstanceCountResponse> week,
                                      List<DailyInstanceCountResponse> month) {

    static DashboardTrendResponse from(DashboardTrend trend) {
        return new DashboardTrendResponse(
                trend.day().stream().map(HourlyInstanceCountResponse::from).toList(),
                trend.week().stream().map(DailyInstanceCountResponse::from).toList(),
                trend.month().stream().map(DailyInstanceCountResponse::from).toList());
    }
}
