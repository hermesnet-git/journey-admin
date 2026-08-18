package com.jouney.admin.domain.flow;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Queue;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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
 * MESSAGE_START_EVENT only ever consume). REQ-03.11.001/002/003/006: a GATEWAY node has at least
 * one input and exactly two outputs (MVP scope — see FT-03.11 for evolution items out of scope),
 * exactly one of which is the default (no condition) and the other carrying a non-blank condition.
 */
public final class FlowValidator {

    private static final Set<FlowNodeType> START_TYPES = Set.of(FlowNodeType.START, FlowNodeType.MESSAGE_START_EVENT);
    private static final Map<FlowNodeType, String> KAFKA_OPERATION_BY_TYPE = Map.of(
            FlowNodeType.SERVICE_TASK, "PRODUCE",
            FlowNodeType.RECEIVE_TASK, "CONSUME",
            FlowNodeType.MESSAGE_START_EVENT, "CONSUME");
    // REQ-03.12.001: same type vocabulary as an outputMapping rule's "type".
    private static final Set<String> VALID_VARIABLE_TYPES = Set.of("string", "number", "boolean", "date", "datetime");
    // REQ-03.09.012: {{name}} references in connectorConfig fields (url, headers, body/payload).
    private static final Pattern VARIABLE_TOKEN = Pattern.compile("\\{\\{\\s*([A-Za-z_][A-Za-z0-9_]*)\\s*\\}\\}");

    private FlowValidator() {
    }

    public static void validate(List<FlowNode> nodes, List<FlowConnection> connections) {
        List<String> violations = new ArrayList<>();

        List<FlowNode> starts = nodes.stream().filter(n -> START_TYPES.contains(n.getType())).toList();
        // REQ-03.11.001: a GATEWAY's two branches may each run to their own END instead of
        // reconverging first, so — unlike the single start element — the flow may have more than
        // one END node; it must just have at least one.
        List<FlowNode> ends = nodes.stream().filter(n -> n.getType() == FlowNodeType.END).toList();
        if (starts.size() != 1) {
            violations.add("The flow must contain exactly one start element, START or MESSAGE_START_EVENT (found "
                    + starts.size() + ")");
        }
        if (ends.isEmpty()) {
            violations.add("The flow must contain at least one END node");
        }

        // REQ-03.09.011/REQ-03.12.002: output variable names and START's declared startVariables
        // names share one uniqueness namespace across the whole journey. Declared here (not down by
        // the outputMapping loop that also feeds it) so the startVariables block below can check
        // against it too.
        Set<String> seenOutputNames = new HashSet<>();

        // REQ-03.12.001/003: {name, type} declarations, valid only on the START node — the
        // variables the caller (canal digital/BFF) must supply when starting an instance. Computed
        // once, up front, since START is trivially an ancestor of every other node in a valid flow —
        // no need to recompute per-node like outputMapping's ancestor scan below.
        Set<String> startVariableNames = new HashSet<>();
        for (FlowNode node : nodes) {
            List<Map<String, Object>> declared = node.getStartVariables();
            if (declared == null || declared.isEmpty()) {
                continue;
            }
            if (node.getType() != FlowNodeType.START) {
                violations.add("Node '" + node.getName() + "' declares startVariables but is not the START node");
                continue;
            }
            for (Map<String, Object> declaration : declared) {
                Object name = declaration.get("name");
                Object type = declaration.get("type");
                if (!(name instanceof String s) || s.isBlank()) {
                    violations.add("START node '" + node.getName() + "' has a startVariables entry without a valid name");
                    continue;
                }
                if (!(type instanceof String t) || !VALID_VARIABLE_TYPES.contains(t)) {
                    violations.add("START node '" + node.getName() + "' declares variable '" + s + "' with an invalid type");
                    continue;
                }
                if (!seenOutputNames.add(s)) {
                    violations.add("Output variable '" + s + "' is declared more than once in the flow");
                    continue;
                }
                startVariableNames.add(s);
            }
        }

        Map<String, Integer> inDegree = new HashMap<>();
        Map<String, Integer> outDegree = new HashMap<>();
        Map<String, List<String>> forward = new HashMap<>();
        Map<String, List<String>> backward = new HashMap<>();
        Map<String, List<FlowConnection>> outgoingConnections = new HashMap<>();
        for (FlowNode node : nodes) {
            inDegree.put(node.getId(), 0);
            outDegree.put(node.getId(), 0);
            forward.put(node.getId(), new ArrayList<>());
            backward.put(node.getId(), new ArrayList<>());
            outgoingConnections.put(node.getId(), new ArrayList<>());
        }
        for (FlowConnection connection : connections) {
            outDegree.merge(connection.getSourceNodeId(), 1, Integer::sum);
            inDegree.merge(connection.getTargetNodeId(), 1, Integer::sum);
            forward.computeIfAbsent(connection.getSourceNodeId(), k -> new ArrayList<>())
                    .add(connection.getTargetNodeId());
            backward.computeIfAbsent(connection.getTargetNodeId(), k -> new ArrayList<>())
                    .add(connection.getSourceNodeId());
            outgoingConnections.computeIfAbsent(connection.getSourceNodeId(), k -> new ArrayList<>()).add(connection);
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
                case GATEWAY -> {
                    if (in < 1 || out != 2) {
                        violations.add("GATEWAY node '" + node.getName()
                                + "' must have at least one input and exactly two outputs (MVP scope)");
                    } else {
                        List<FlowConnection> outgoing = outgoingConnections.getOrDefault(node.getId(), List.of());
                        long defaultCount = outgoing.stream().filter(FlowConnection::isDefault).count();
                        if (defaultCount != 1) {
                            violations.add("GATEWAY node '" + node.getName()
                                    + "' must have exactly one default output (found " + defaultCount + ")");
                        }
                        for (FlowConnection connection : outgoing) {
                            if (!connection.isDefault() && (connection.getCondition() == null || connection.getCondition().isBlank())) {
                                violations.add("GATEWAY node '" + node.getName()
                                        + "' has a non-default output without a condition");
                            }
                        }
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

                // REQ-03.09.014: every {{name}} referenced by this node's connector config must be
                // declared by some ancestor's output mapping (REQ-03.09.010) reachable backwards from it.
                Set<String> usedTokens = new HashSet<>();
                collectVariableTokens(connectorConfig.getConfig(), usedTokens);
                if (!usedTokens.isEmpty()) {
                    Set<String> ancestorIds = bfs(node.getId(), backward);
                    Set<String> availableVars = new HashSet<>(startVariableNames);
                    for (FlowNode other : nodes) {
                        if (other.getId().equals(node.getId()) || !ancestorIds.contains(other.getId())) {
                            continue;
                        }
                        if (other.getConnectorConfig() != null) {
                            for (Map<String, Object> rule : outputMappingOf(other.getConnectorConfig())) {
                                Object name = rule.get("name");
                                if (name instanceof String s && !s.isBlank()) {
                                    availableVars.add(s);
                                }
                            }
                        }
                    }
                    for (String token : usedTokens) {
                        if (!availableVars.contains(token)) {
                            violations.add("Node '" + node.getName() + "' references undeclared variable '{{" + token
                                    + "}}'");
                        }
                    }
                }
            }
        }

        // REQ-03.11.004/006: {{name}} referenced in a gateway's condition must be declared by some
        // ancestor Service/Receive Task's output mapping reachable backwards from the gateway.
        // ponytail: a condition referencing a User Task form field name isn't checked against the
        // form's real fields — Form data isn't available to this pure-domain validator — so that
        // half of REQ-03.11.004 is accepted without verification for now.
        for (FlowNode node : nodes) {
            if (node.getType() != FlowNodeType.GATEWAY) {
                continue;
            }
            for (FlowConnection connection : outgoingConnections.getOrDefault(node.getId(), List.of())) {
                Set<String> usedTokens = new HashSet<>();
                collectVariableTokens(connection.getCondition(), usedTokens);
                if (usedTokens.isEmpty()) {
                    continue;
                }
                Set<String> ancestorIds = bfs(node.getId(), backward);
                Set<String> availableVars = new HashSet<>(startVariableNames);
                for (FlowNode other : nodes) {
                    if (other.getId().equals(node.getId()) || !ancestorIds.contains(other.getId())) {
                        continue;
                    }
                    if (other.getConnectorConfig() != null) {
                        for (Map<String, Object> rule : outputMappingOf(other.getConnectorConfig())) {
                            if (rule.get("name") instanceof String s && !s.isBlank()) {
                                availableVars.add(s);
                            }
                        }
                    }
                }
                for (String token : usedTokens) {
                    if (!availableVars.contains(token)) {
                        violations.add("GATEWAY node '" + node.getName() + "' condition references undeclared variable '{{"
                                + token + "}}'");
                    }
                }
            }
        }

        // REQ-03.09.011: output variable names must be unique across the whole journey
        // (seenOutputNames already carries any startVariables names from the block above).
        for (FlowNode node : nodes) {
            if (node.getConnectorConfig() == null) {
                continue;
            }
            for (Map<String, Object> rule : outputMappingOf(node.getConnectorConfig())) {
                Object name = rule.get("name");
                if (name instanceof String s && !s.isBlank() && !seenOutputNames.add(s)) {
                    violations.add("Output variable '" + s + "' is declared more than once in the flow");
                }
            }
        }

        if (starts.size() == 1 && !ends.isEmpty()) {
            Set<String> reachableFromStart = bfs(starts.get(0).getId(), forward);
            // A node only needs to reach *some* END, not a specific one — each GATEWAY branch may
            // lead to its own.
            Set<String> reachingEnd = new HashSet<>();
            for (FlowNode end : ends) {
                reachingEnd.addAll(bfs(end.getId(), backward));
            }
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

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> outputMappingOf(ConnectorConfig connectorConfig) {
        if (connectorConfig.getConfig() == null) {
            return List.of();
        }
        Object raw = connectorConfig.getConfig().get("outputMapping");
        if (!(raw instanceof List<?> list)) {
            return List.of();
        }
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object item : list) {
            if (item instanceof Map<?, ?> map) {
                result.add((Map<String, Object>) map);
            }
        }
        return result;
    }

    private static void collectVariableTokens(Object value, Set<String> tokens) {
        if (value instanceof String s) {
            Matcher matcher = VARIABLE_TOKEN.matcher(s);
            while (matcher.find()) {
                tokens.add(matcher.group(1));
            }
        } else if (value instanceof Map<?, ?> map) {
            map.values().forEach(v -> collectVariableTokens(v, tokens));
        } else if (value instanceof List<?> list) {
            list.forEach(v -> collectVariableTokens(v, tokens));
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
