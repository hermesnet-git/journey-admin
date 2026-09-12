package com.jouney.admin.interfaces.diagnostico;

import com.jouney.admin.domain.diagnostico.ExecutionHistoryDetail;
import com.jouney.admin.domain.diagnostico.HistoryStep;
import com.jouney.admin.domain.diagnostico.IncidentEntry;
import com.jouney.admin.domain.diagnostico.VariableSnapshot;
import com.jouney.admin.domain.diagnostico.VariableTimelineEntry;
import com.jouney.admin.interfaces.execution.FlowBundleResponse;
import java.util.List;
import java.util.UUID;

public record InstanceHistoryResponse(String processInstanceId, String businessKey, UUID journeyId,
                                       String journeyName, Integer versionNumber, String state, String startTime,
                                       String endTime, Long durationMillis, FlowBundleResponse flow,
                                       List<HistoryStep> steps, List<VariableSnapshot> variables,
                                       List<VariableTimelineEntry> variableTimeline, List<IncidentEntry> incidents,
                                       String currentNodeId) {

    public static InstanceHistoryResponse from(ExecutionHistoryDetail detail) {
        return new InstanceHistoryResponse(detail.processInstanceId(), detail.businessKey(), detail.journeyId(),
                detail.journeyName(), detail.versionNumber(), detail.state(), detail.startTime(), detail.endTime(),
                detail.durationMillis(),
                FlowBundleResponse.of(detail.channelTypes(), detail.flowNodes(), detail.flowConnections()),
                detail.steps(), detail.variables(), detail.variableTimeline(), detail.incidents(),
                detail.currentNodeId());
    }
}
