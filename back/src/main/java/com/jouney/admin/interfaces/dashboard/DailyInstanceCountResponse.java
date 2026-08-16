package com.jouney.admin.interfaces.dashboard;

import com.jouney.admin.domain.dashboard.DailyInstanceCount;
import java.time.LocalDate;

public record DailyInstanceCountResponse(LocalDate date, long started, long completed) {

    static DailyInstanceCountResponse from(DailyInstanceCount d) {
        return new DailyInstanceCountResponse(d.date(), d.started(), d.completed());
    }
}
