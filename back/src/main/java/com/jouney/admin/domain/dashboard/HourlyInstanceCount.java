package com.jouney.admin.domain.dashboard;

import java.time.Instant;

public record HourlyInstanceCount(Instant hour, long started, long completed) {
}
