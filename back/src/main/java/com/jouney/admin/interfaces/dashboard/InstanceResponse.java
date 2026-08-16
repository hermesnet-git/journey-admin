package com.jouney.admin.interfaces.dashboard;

import com.jouney.admin.domain.dashboard.HistoricInstanceSummary;
import java.time.Instant;

public record InstanceResponse(String id, String processDefinitionName, String businessKey, Instant startTime,
                                Instant endTime, Long durationMillis, String state) {

    static InstanceResponse from(HistoricInstanceSummary i) {
        return new InstanceResponse(i.id(), i.processDefinitionName(), i.businessKey(), i.startTime(), i.endTime(),
                i.durationMillis(), i.state());
    }
}
