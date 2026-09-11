package com.jouney.admin.interfaces.execution;

import com.jouney.admin.domain.execution.ExecutionStep;
import com.jouney.admin.domain.execution.ResolvedForm;
import com.jouney.admin.domain.execution.TrailEntry;
import com.jouney.admin.interfaces.execution.FlowBundleResponse.ConnectorConfigInfo;
import java.util.List;

public record StepResponse(String type, String taskId, String nodeId, String nodeName, String nodeType,
                            ResolvedForm form, List<TrailEntry> trail, String errorNodeId, String errorNodeName,
                            String errorMessage, ConnectorConfigInfo errorConnectorConfig) {

    public static StepResponse from(ExecutionStep step) {
        return new StepResponse(step.type(), step.taskId(), step.nodeId(), step.nodeName(), step.nodeType(),
                step.form(), step.trail(), step.errorNodeId(), step.errorNodeName(), step.errorMessage(),
                ConnectorConfigInfo.from(step.errorConnectorConfig()));
    }
}
