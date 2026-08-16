package com.jouney.admin.domain.dashboard;

import java.time.LocalDate;

public record DailyInstanceCount(LocalDate date, long started, long completed) {
}
