package com.jouney.admin.domain.journey;

import com.jouney.admin.domain.flow.Flow;
import com.jouney.admin.domain.flow.FlowConnection;
import com.jouney.admin.domain.flow.FlowIds;
import com.jouney.admin.domain.flow.FlowNode;
import com.jouney.admin.domain.flow.FlowNodeType;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * A system-provided starting point for a journey flow. Templates keep stable internal keys only;
 * every instantiation generates fresh BPMN-safe node and connection ids so journeys never share
 * mutable flow identity.
 */
public record JourneyTemplate(String id, String name, String description, List<NodeSpec> nodes,
                              List<ConnectionSpec> connections) {

    public Flow instantiate(UUID journeyId) {
        Map<String, String> nodeIds = new HashMap<>();
        List<FlowNode> instantiatedNodes = nodes.stream().map(spec -> {
            String nodeId = FlowIds.newNodeId();
            nodeIds.put(spec.key(), nodeId);
            return new FlowNode(nodeId, spec.type(), spec.name(), spec.description(), spec.positionX(),
                    spec.positionY(), null, null, null, null);
        }).toList();
        List<FlowConnection> instantiatedConnections = connections.stream()
                .map(spec -> new FlowConnection(FlowIds.newConnectionId(), requiredNodeId(nodeIds, spec.from()),
                        requiredNodeId(nodeIds, spec.to()), spec.condition(), spec.isDefault()))
                .toList();
        OffsetDateTime now = OffsetDateTime.now();
        return new Flow(FlowIds.newFlowId(), journeyId, "Fluxo principal", instantiatedNodes,
                instantiatedConnections, List.of(), now, now);
    }

    private static String requiredNodeId(Map<String, String> nodeIds, String key) {
        String nodeId = nodeIds.get(key);
        if (nodeId == null) {
            throw new IllegalStateException("Journey template references unknown node key: " + key);
        }
        return nodeId;
    }

    public record NodeSpec(String key, FlowNodeType type, String name, String description,
                           int positionX, int positionY) {
    }

    public record ConnectionSpec(String from, String to, String condition, boolean isDefault) {
    }
}
