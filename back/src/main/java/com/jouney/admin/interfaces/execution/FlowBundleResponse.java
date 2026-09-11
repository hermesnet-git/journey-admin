package com.jouney.admin.interfaces.execution;

import com.jouney.admin.domain.channel.ChannelType;
import com.jouney.admin.domain.flow.ConnectorConfig;
import com.jouney.admin.domain.flow.ConnectorType;
import com.jouney.admin.domain.flow.FlowConnection;
import com.jouney.admin.domain.flow.FlowNode;
import com.jouney.admin.domain.flow.FlowNodeType;
import com.jouney.admin.domain.publication.Publication;
import java.util.List;
import java.util.Map;

/** Diagrama pra desenho na tela de Execução — subconjunto de {@link Publication}, sem os campos
 * administrativos (nome/produto/datas) que essa tela não usa. */
public record FlowBundleResponse(List<ChannelType> channelTypes, List<FlowNodeInfo> flowNodes,
                                  List<FlowConnectionInfo> flowConnections) {

    public static FlowBundleResponse from(Publication publication) {
        return of(publication.getChannelTypes(), publication.getFlowNodes(), publication.getFlowConnections());
    }

    public static FlowBundleResponse of(List<ChannelType> channelTypes, List<FlowNode> flowNodes,
                                         List<FlowConnection> flowConnections) {
        return new FlowBundleResponse(channelTypes, flowNodes.stream().map(FlowNodeInfo::from).toList(),
                flowConnections.stream().map(FlowConnectionInfo::from).toList());
    }

    public record FlowNodeInfo(String id, FlowNodeType type, String name, int positionX, int positionY,
                                ConnectorConfigInfo connectorConfig, List<Map<String, Object>> startVariables) {

        public static FlowNodeInfo from(FlowNode node) {
            return new FlowNodeInfo(node.getId(), node.getType(), node.getName(), node.getPositionX(),
                    node.getPositionY(), ConnectorConfigInfo.from(node.getConnectorConfig()), node.getStartVariables());
        }
    }

    public record ConnectorConfigInfo(ConnectorType connectorType, Map<String, Object> config) {

        public static ConnectorConfigInfo from(ConnectorConfig config) {
            return config != null ? new ConnectorConfigInfo(config.getConnectorType(), config.getConfig()) : null;
        }
    }

    public record FlowConnectionInfo(String id, String sourceNodeId, String targetNodeId, String condition,
                                      boolean isDefault) {

        public static FlowConnectionInfo from(FlowConnection connection) {
            return new FlowConnectionInfo(connection.getId(), connection.getSourceNodeId(),
                    connection.getTargetNodeId(), connection.getCondition(), connection.isDefault());
        }
    }
}
