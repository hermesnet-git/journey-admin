package com.jouney.admin.interfaces.dashboard;

import com.jouney.admin.domain.dashboard.HourlyInstanceCount;
import java.time.Instant;

public record HourlyInstanceCountResponse(Instant hour, long started, long completed) {

    static HourlyInstanceCountResponse from(HourlyInstanceCount h) {
        return new HourlyInstanceCountResponse(h.hour(), h.started(), h.completed());
    }
}
