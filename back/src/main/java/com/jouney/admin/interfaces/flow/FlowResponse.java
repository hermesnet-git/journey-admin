package com.jouney.admin.interfaces.flow;

import com.jouney.admin.domain.flow.ConnectorConfig;
import com.jouney.admin.domain.flow.ConnectorType;
import com.jouney.admin.domain.flow.Flow;
import com.jouney.admin.domain.flow.FlowAnnotation;
import com.jouney.admin.domain.flow.FlowConnection;
import com.jouney.admin.domain.flow.FlowNode;
import com.jouney.admin.domain.flow.FlowNodeType;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record FlowResponse(String flowId, UUID journeyId, String name, List<NodeResponse> nodes,
                            List<ConnectionResponse> connections, List<AnnotationResponse> annotations) {

    public static FlowResponse from(Flow flow) {
        return new FlowResponse(flow.getId(), flow.getJourneyId(), flow.getName(),
                flow.getNodes().stream().map(NodeResponse::from).toList(),
                flow.getConnections().stream().map(ConnectionResponse::from).toList(),
                flow.getAnnotations().stream().map(AnnotationResponse::from).toList());
    }

    public record NodeResponse(String nodeId, FlowNodeType nodeType, String name, String description, int positionX,
                                int positionY, UserTaskConfigResponse userTaskConfig,
                                ConnectorConfigResponse connectorConfig, List<Map<String, Object>> startVariables) {

        public static NodeResponse from(FlowNode node) {
            UserTaskConfigResponse userTaskConfig = node.getFormId() != null || node.getMessageText() != null
                    ? new UserTaskConfigResponse(node.getFormId(), node.getMessageText())
                    : null;
            ConnectorConfigResponse connectorConfig = node.getConnectorConfig() != null
                    ? ConnectorConfigResponse.from(node.getConnectorConfig())
                    : null;
            return new NodeResponse(node.getId(), node.getType(), node.getName(), node.getDescription(),
                    node.getPositionX(), node.getPositionY(), userTaskConfig, connectorConfig,
                    node.getStartVariables());
        }
    }

    public record UserTaskConfigResponse(UUID formId, String messageText) {
    }

    public record ConnectorConfigResponse(ConnectorType connectorType, Map<String, Object> config,
                                           String credentialRef) {

        public static ConnectorConfigResponse from(ConnectorConfig config) {
            return new ConnectorConfigResponse(config.getConnectorType(), config.getConfig(),
                    config.getCredentialRef());
        }
    }

    public record ConnectionResponse(String connectionId, String sourceNodeId, String targetNodeId, String condition,
                                      boolean isDefault) {

        public static ConnectionResponse from(FlowConnection connection) {
            return new ConnectionResponse(connection.getId(), connection.getSourceNodeId(),
                    connection.getTargetNodeId(), connection.getCondition(), connection.isDefault());
        }
    }

    public record AnnotationResponse(String id, String text, int positionX, int positionY,
                                      List<String> linkedNodeIds) {

        public static AnnotationResponse from(FlowAnnotation annotation) {
            return new AnnotationResponse(annotation.getId(), annotation.getText(), annotation.getPositionX(),
                    annotation.getPositionY(), annotation.getLinkedNodeIds());
        }
    }
}
