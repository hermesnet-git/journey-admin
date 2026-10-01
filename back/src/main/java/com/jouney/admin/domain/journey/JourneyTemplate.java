package com.jouney.admin.domain.journey;

import com.jouney.admin.domain.channel.ChannelType;
import com.jouney.admin.domain.flow.ConnectorConfig;
import com.jouney.admin.domain.flow.ConnectorType;
import com.jouney.admin.domain.flow.Flow;
import com.jouney.admin.domain.flow.FlowAnnotation;
import com.jouney.admin.domain.flow.FlowSection;
import com.jouney.admin.domain.flow.FlowConnection;
import com.jouney.admin.domain.flow.FlowIds;
import com.jouney.admin.domain.flow.FlowNode;
import com.jouney.admin.domain.sdui.SduiNode;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * A system-provided example journey: a complete flow (screens, integrations, decisions, notes on the
 * canvas) plus the catalog metadata the "Nova jornada" gallery shows. Templates keep stable internal
 * ids only; every instantiation generates fresh BPMN-safe node, connection and note ids so journeys
 * never share mutable flow identity.
 *
 * Integrations that depend on the environment (messaging cluster, topic and credential, screen data
 * source) deliberately come empty — {@link #pendingSetup()} lists them, and FlowValidator blocks the
 * publication until the author fills them in.
 */
public record JourneyTemplate(String id, String name, String description, String track, String area,
                              List<ChannelType> channelTypes, List<String> highlights, String flowName,
                              List<FlowNode> nodes, List<FlowConnection> connections,
                              List<FlowAnnotation> annotations, List<FlowSection> sections) {

    public Flow instantiate(UUID journeyId) {
        Map<String, String> nodeIds = new HashMap<>();
        List<FlowNode> instantiatedNodes = nodes.stream().map(node -> {
            String nodeId = FlowIds.newNodeId();
            nodeIds.put(node.getId(), nodeId);
            return new FlowNode(nodeId, node.getType(), node.getName(), node.getDescription(), node.getPositionX(),
                    node.getPositionY(), node.getConnectorConfig(), node.getStartVariables(),
                    node.getEmbeddedScreenRoot(), null, node.getScreenDataSources());
        }).toList();
        List<FlowConnection> instantiatedConnections = connections.stream()
                .map(connection -> new FlowConnection(FlowIds.newConnectionId(),
                        requiredNodeId(nodeIds, connection.getSourceNodeId()),
                        requiredNodeId(nodeIds, connection.getTargetNodeId()), connection.getCondition(),
                        connection.isDefault(), connection.isOnError(), connection.getLabel()))
                .toList();
        List<FlowAnnotation> instantiatedAnnotations = annotations.stream()
                .map(annotation -> new FlowAnnotation("Annotation_" + UUID.randomUUID(), annotation.getText(),
                        annotation.getPositionX(), annotation.getPositionY(),
                        annotation.getLinkedNodeIds().stream().map(id -> requiredNodeId(nodeIds, id)).toList()))
                .toList();
        List<FlowSection> instantiatedSections = sections.stream()
                .map(section -> new FlowSection("Section_" + UUID.randomUUID(), section.name(),
                        section.nodeIds().stream().map(id -> requiredNodeId(nodeIds, id)).toList()))
                .toList();
        OffsetDateTime now = OffsetDateTime.now();
        return new Flow(FlowIds.newFlowId(), journeyId, flowName, instantiatedNodes, instantiatedConnections,
                instantiatedAnnotations, now, now).withSections(instantiatedSections);
    }

    /** What the example exercises, derived from the flow itself so the gallery never claims something
     * the template doesn't actually do. */
    public List<String> capabilities() {
        Set<String> found = new LinkedHashSet<>();
        for (FlowNode node : nodes) {
            ConnectorType connector = node.getConnectorConfig() != null ? node.getConnectorConfig().getConnectorType() : null;
            switch (node.getType()) {
                case GATEWAY -> found.add("Decisão");
                case MESSAGE_START_EVENT -> found.add("Início por mensagem");
                case RECEIVE_TASK -> found.add("Espera de mensagem");
                case SERVICE_TASK -> found.add(connector == ConnectorType.REST ? "Integração REST" : "Publicação de mensagem");
                default -> {
                }
            }
            if (connector == ConnectorType.KAFKA) {
                found.add("Kafka");
            }
            if (node.getStartVariables() != null && !node.getStartVariables().isEmpty()) {
                found.add("Variáveis de entrada");
            }
            if (node.getScreenDataSources() != null && !node.getScreenDataSources().isEmpty()) {
                found.add("Fonte de dados");
            }
            if (node.getEmbeddedScreenRoot() != null) {
                collectScreenCapabilities(node.getEmbeddedScreenRoot(), found);
            }
            Map<String, Object> config = node.getConnectorConfig() != null ? node.getConnectorConfig().getConfig() : null;
            if (connector == ConnectorType.REST && config != null) {
                if (config.get("retries") instanceof Number retries && retries.intValue() > 0) {
                    found.add("Novas tentativas");
                }
                if (Boolean.TRUE.equals(config.get("background"))) {
                    found.add("Segundo plano");
                }
            }
        }
        if (connections.stream().anyMatch(FlowConnection::isOnError)) {
            found.add("Caminho “Se falhar”");
        }
        return List.copyOf(found);
    }

    /** Environment-specific pieces the template leaves empty on purpose — the author picks them in the
     * editor before publishing. */
    public List<String> pendingSetup() {
        List<String> pending = new ArrayList<>();
        for (FlowNode node : nodes) {
            ConnectorConfig connector = node.getConnectorConfig();
            if (connector != null && connector.getConnectorType().isMessageBroker()
                    && !connector.hasMessagingDestination()) {
                pending.add("Cluster, tópico e credencial de mensageria em “" + node.getName() + "”");
            }
            if (node.getScreenDataSources() != null) {
                for (Map<String, Object> dataSource : node.getScreenDataSources()) {
                    if (!(dataSource.get("source") instanceof String source) || source.isBlank()) {
                        pending.add("Fonte de dados “" + dataSource.get("alias") + "” da tela “" + node.getName() + "”");
                    }
                }
            }
        }
        return pending;
    }

    private static void collectScreenCapabilities(SduiNode sduiNode, Set<String> found) {
        if ("ui.selectList".equals(sduiNode.type())) {
            found.add("Lista de seleção");
        }
        if (sduiNode.visibility() != null) {
            found.add("channel".equals(sduiNode.visibility().path()) ? "Conteúdo por canal" : "Campo condicional");
        }
        if (sduiNode.children() != null) {
            sduiNode.children().forEach(child -> collectScreenCapabilities(child, found));
        }
    }

    private static String requiredNodeId(Map<String, String> nodeIds, String key) {
        String nodeId = nodeIds.get(key);
        if (nodeId == null) {
            throw new IllegalStateException("Journey template references unknown node: " + key);
        }
        return nodeId;
    }
}
