package com.jouney.admin.domain.flow;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Queue;
import java.util.Set;

/**
 * Enforces REQ-03.01.004, REQ-03.02.004/005/006 and REQ-03.07.005: exactly
 * one start element (START or MESSAGE_START_EVENT) and one END; the start
 * element has no input and exactly one output; USER_TASK/SERVICE_TASK/
 * RECEIVE_TASK have at least one input and exactly one output; END has at
 * least one input and no outputs; every node sits on a continuous path
 * reachable from the start element and able to reach END. Also enforces
 * REQ-03.08.004 (connector must be enabled), REQ-03.09.007 (REST is not a
 * valid connector for MESSAGE_START_EVENT — it starts the flow from an
 * incoming message, it never calls out) and REQ-03.09.008 (Kafka operation is
 * implied by the node's role: SERVICE_TASK produces, RECEIVE_TASK and
 * MESSAGE_START_EVENT only ever consume).
 */
public final class FlowValidator {

    private static final Set<FlowNodeType> START_TYPES = Set.of(FlowNodeType.START, FlowNodeType.MESSAGE_START_EVENT);
    private static final Map<FlowNodeType, String> KAFKA_OPERATION_BY_TYPE = Map.of(
            FlowNodeType.SERVICE_TASK, "PRODUCE",
            FlowNodeType.RECEIVE_TASK, "CONSUME",
            FlowNodeType.MESSAGE_START_EVENT, "CONSUME");

    private FlowValidator() {
    }

    public static void validate(List<FlowNode> nodes, List<FlowConnection> connections) {
        List<String> violations = new ArrayList<>();

        List<FlowNode> starts = nodes.stream().filter(n -> START_TYPES.contains(n.getType())).toList();
        List<FlowNode> ends = nodes.stream().filter(n -> n.getType() == FlowNodeType.END).toList();
        if (starts.size() != 1) {
            violations.add("The flow must contain exactly one start element, START or MESSAGE_START_EVENT (found "
                    + starts.size() + ")");
        }
        if (ends.size() != 1) {
            violations.add("The flow must contain exactly one END node (found " + ends.size() + ")");
        }

        Map<String, Integer> inDegree = new HashMap<>();
        Map<String, Integer> outDegree = new HashMap<>();
        Map<String, List<String>> forward = new HashMap<>();
        Map<String, List<String>> backward = new HashMap<>();
        for (FlowNode node : nodes) {
            inDegree.put(node.getId(), 0);
            outDegree.put(node.getId(), 0);
            forward.put(node.getId(), new ArrayList<>());
            backward.put(node.getId(), new ArrayList<>());
        }
        for (FlowConnection connection : connections) {
            outDegree.merge(connection.getSourceNodeId(), 1, Integer::sum);
            inDegree.merge(connection.getTargetNodeId(), 1, Integer::sum);
            forward.computeIfAbsent(connection.getSourceNodeId(), k -> new ArrayList<>())
                    .add(connection.getTargetNodeId());
            backward.computeIfAbsent(connection.getTargetNodeId(), k -> new ArrayList<>())
                    .add(connection.getSourceNodeId());
        }

        for (FlowNode node : nodes) {
            int in = inDegree.getOrDefault(node.getId(), 0);
            int out = outDegree.getOrDefault(node.getId(), 0);
            switch (node.getType()) {
                case START, MESSAGE_START_EVENT -> {
                    if (in != 0 || out != 1) {
                        violations.add(node.getType() + " node '" + node.getName()
                                + "' must have no inputs and exactly one output");
                    }
                }
                case USER_TASK, SERVICE_TASK, RECEIVE_TASK -> {
                    if (in < 1 || out != 1) {
                        violations.add(node.getType() + " node '" + node.getName()
                                + "' must have at least one input and exactly one output");
                    }
                }
                case END -> {
                    if (in < 1 || out != 0) {
                        violations.add("END node '" + node.getName()
                                + "' must have at least one input and no outputs");
                    }
                }
            }

            if (node.getConnectorConfig() != null) {
                ConnectorConfig connectorConfig = node.getConnectorConfig();
                if (!connectorConfig.getConnectorType().isEnabled()) {
                    violations.add("Node '" + node.getName() + "' references a disabled connector ("
                            + connectorConfig.getConnectorType() + ")");
                }
                if (node.getType() == FlowNodeType.MESSAGE_START_EVENT
                        && connectorConfig.getConnectorType() == ConnectorType.REST) {
                    violations.add("MESSAGE_START_EVENT node '" + node.getName()
                            + "' cannot use a REST connector; only KAFKA (consume) starts a flow from an incoming message");
                }
                if (connectorConfig.getConnectorType() == ConnectorType.KAFKA) {
                    String expectedOperation = KAFKA_OPERATION_BY_TYPE.get(node.getType());
                    Object operation = connectorConfig.getConfig() != null ? connectorConfig.getConfig().get("operation") : null;
                    if (expectedOperation != null && operation != null && !expectedOperation.equals(operation)) {
                        violations.add("Node '" + node.getName() + "' Kafka operation must be " + expectedOperation
                                + " for " + node.getType());
                    }
                }
            }
        }

        if (starts.size() == 1 && ends.size() == 1) {
            Set<String> reachableFromStart = bfs(starts.get(0).getId(), forward);
            Set<String> reachingEnd = bfs(ends.get(0).getId(), backward);
            for (FlowNode node : nodes) {
                if (!reachableFromStart.contains(node.getId()) || !reachingEnd.contains(node.getId())) {
                    violations.add("Node '" + node.getName() + "' is not on a continuous path between START and END");
                }
            }
        }

        if (!violations.isEmpty()) {
            throw new FlowValidationException(violations);
        }
    }

    private static Set<String> bfs(String startId, Map<String, List<String>> graph) {
        Set<String> seen = new HashSet<>();
        seen.add(startId);
        Queue<String> queue = new ArrayDeque<>();
        queue.add(startId);
        while (!queue.isEmpty()) {
            String current = queue.poll();
            for (String next : graph.getOrDefault(current, List.of())) {
                if (seen.add(next)) {
                    queue.add(next);
                }
            }
        }
        return seen;
    }
}
