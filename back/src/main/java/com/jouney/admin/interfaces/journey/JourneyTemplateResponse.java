package com.jouney.admin.interfaces.journey;

import com.jouney.admin.domain.channel.ChannelType;
import com.jouney.admin.domain.flow.FlowConnection;
import com.jouney.admin.domain.flow.FlowNode;
import com.jouney.admin.domain.flow.FlowNodeType;
import com.jouney.admin.domain.journey.JourneyTemplate;
import java.util.List;

// preview: só o desenho do fluxo (tipo, nome e posição de cada etapa e as ligações), o bastante pra
// galeria mostrar o template antes de criar a jornada — telas e configurações ficam de fora.
public record JourneyTemplateResponse(String templateId, String name, String description, String track, String area,
                                      List<ChannelType> channelTypes, List<String> highlights,
                                      List<String> capabilities, List<String> pendingSetup, Preview preview) {

    public static JourneyTemplateResponse from(JourneyTemplate template) {
        return new JourneyTemplateResponse(template.id(), template.name(), template.description(), template.track(),
                template.area(), template.channelTypes(), template.highlights(), template.capabilities(),
                template.pendingSetup(),
                new Preview(template.nodes().stream().map(PreviewNode::from).toList(),
                        template.connections().stream().map(PreviewConnection::from).toList()));
    }

    public record Preview(List<PreviewNode> nodes, List<PreviewConnection> connections) {
    }

    public record PreviewNode(String nodeId, FlowNodeType nodeType, String name, int positionX, int positionY,
                              String connectorType) {

        static PreviewNode from(FlowNode node) {
            return new PreviewNode(node.getId(), node.getType(), node.getName(), node.getPositionX(),
                    node.getPositionY(),
                    node.getConnectorConfig() != null ? node.getConnectorConfig().getConnectorType().name() : null);
        }
    }

    public record PreviewConnection(String connectionId, String sourceNodeId, String targetNodeId, String condition,
                                    boolean isDefault) {

        static PreviewConnection from(FlowConnection connection) {
            return new PreviewConnection(connection.getId(), connection.getSourceNodeId(),
                    connection.getTargetNodeId(), connection.getCondition(), connection.isDefault());
        }
    }
}
