package com.jouney.especregistry.simulation;

import java.util.List;
import java.util.UUID;

public record InstanceHistoryResponse(String processInstanceId, String businessKey, UUID journeyId,
                                       String journeyName, Integer versionNumber, String state, String startTime,
                                       String endTime, Long durationMillis, FlowBundle flow,
                                       List<HistoryStep> steps) {
}
