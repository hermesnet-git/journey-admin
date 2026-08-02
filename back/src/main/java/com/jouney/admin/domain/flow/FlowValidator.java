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
 * Enforces REQ-03.01.004 and REQ-03.02.004/005/006: exactly one START and one
 * END; START has no input and exactly one output; USER_TASK has at least one
 * input and exactly one output; END has at least one input and no outputs;
 * every node sits on a continuous path reachable from START and able to
 * reach END.
 */
public final class FlowValidator {

    private FlowValidator() {
    }

    public static void validate(List<FlowNode> nodes, List<FlowConnection> connections) {
        List<String> violations = new ArrayList<>();

        List<FlowNode> starts = nodes.stream().filter(n -> n.getType() == FlowNodeType.START).toList();
        List<FlowNode> ends = nodes.stream().filter(n -> n.getType() == FlowNodeType.END).toList();
        if (starts.size() != 1) {
            violations.add("The flow must contain exactly one START node (found " + starts.size() + ")");
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
                case START -> {
                    if (in != 0 || out != 1) {
                        violations.add("START node '" + node.getName()
                                + "' must have no inputs and exactly one output");
                    }
                }
                case USER_TASK -> {
                    if (in < 1 || out != 1) {
                        violations.add("USER_TASK node '" + node.getName()
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
