package com.jouney.admin.interfaces.flow;

import com.jouney.admin.domain.flow.Flow;
import com.jouney.admin.domain.flow.FlowConnection;
import com.jouney.admin.domain.flow.FlowNode;
import com.jouney.admin.domain.flow.FlowNodeType;
import java.util.List;
import java.util.UUID;

public record FlowResponse(String flowId, UUID journeyId, String name, List<NodeResponse> nodes,
                            List<ConnectionResponse> connections) {

    public static FlowResponse from(Flow flow) {
        return new FlowResponse(flow.getId(), flow.getJourneyId(), flow.getName(),
                flow.getNodes().stream().map(NodeResponse::from).toList(),
                flow.getConnections().stream().map(ConnectionResponse::from).toList());
    }

    public record NodeResponse(String nodeId, FlowNodeType nodeType, String name, String description, int positionX,
                                int positionY, UserTaskConfigResponse userTaskConfig) {

        public static NodeResponse from(FlowNode node) {
            UserTaskConfigResponse config = node.getFormId() != null
                    ? new UserTaskConfigResponse(node.getFormId())
                    : null;
            return new NodeResponse(node.getId(), node.getType(), node.getName(), node.getDescription(),
                    node.getPositionX(), node.getPositionY(), config);
        }
    }

    public record UserTaskConfigResponse(UUID formId) {
    }

    public record ConnectionResponse(String connectionId, String sourceNodeId, String targetNodeId) {

        public static ConnectionResponse from(FlowConnection connection) {
            return new ConnectionResponse(connection.getId(), connection.getSourceNodeId(),
                    connection.getTargetNodeId());
        }
    }
}
