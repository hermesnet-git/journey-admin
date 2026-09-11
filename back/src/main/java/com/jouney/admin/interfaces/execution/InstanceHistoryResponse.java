package com.jouney.admin.interfaces.execution;

import com.jouney.admin.domain.execution.ExecutionHistoryDetail;
import com.jouney.admin.domain.execution.HistoryStep;
import java.util.List;
import java.util.UUID;

public record InstanceHistoryResponse(String processInstanceId, String businessKey, UUID journeyId,
                                       String journeyName, Integer versionNumber, String state, String startTime,
                                       String endTime, Long durationMillis, FlowBundleResponse flow,
                                       List<HistoryStep> steps) {

    public static InstanceHistoryResponse from(ExecutionHistoryDetail detail) {
        return new InstanceHistoryResponse(detail.processInstanceId(), detail.businessKey(), detail.journeyId(),
                detail.journeyName(), detail.versionNumber(), detail.state(), detail.startTime(), detail.endTime(),
                detail.durationMillis(),
                FlowBundleResponse.of(detail.channelTypes(), detail.flowNodes(), detail.flowConnections()),
                detail.steps());
    }
}
