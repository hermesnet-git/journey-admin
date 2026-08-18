package com.jouney.especregistry.simulation;

import com.jouney.especregistry.adminback.FlowConnection;
import com.jouney.especregistry.adminback.FlowNode;
import com.jouney.especregistry.adminback.PublicationSnapshot;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Mirrors FlowValidator's structural check (admin/back, {@code reachesEndWithoutCheckpoint}) — same
 * rule, ported here (no shared module between the two services) so a journey published before that
 * rule existed can still be caught before ever calling Camunda, instead of only after it crashes. */
final class SynchronousChainCheck {

    private SynchronousChainCheck() {
    }

    static void verify(PublicationSnapshot snapshot) {
        Map<String, FlowNode> byId = new HashMap<>();
        snapshot.flowNodes().forEach(n -> byId.put(n.id(), n));
        Map<String, List<String>> backward = new HashMap<>();
        for (FlowConnection c : snapshot.flowConnections()) {
            backward.computeIfAbsent(c.targetNodeId(), k -> new ArrayList<>()).add(c.sourceNodeId());
        }
        for (FlowNode node : snapshot.flowNodes()) {
            if ("END".equals(node.type()) && reachesEndWithoutCheckpoint(node, backward, byId)) {
                throw new SynchronousChainUnsupportedException(node.name());
            }
        }
    }

    private static boolean reachesEndWithoutCheckpoint(FlowNode end, Map<String, List<String>> backward,
                                                         Map<String, FlowNode> byId) {
        Set<String> seen = new HashSet<>();
        Deque<String> queue = new ArrayDeque<>();
        seen.add(end.id());
        queue.add(end.id());
        while (!queue.isEmpty()) {
            String current = queue.poll();
            FlowNode node = byId.get(current);
            if (node == null) {
                continue;
            }
            if (isSynchronousRestTask(node)) {
                return true;
            }
            if (isCheckpoint(node)) {
                continue; // engine pauses here (User Task, or an external-task node awaiting a worker) — don't look further back through it
            }
            for (String prev : backward.getOrDefault(current, List.of())) {
                if (seen.add(prev)) {
                    queue.add(prev);
                }
            }
        }
        return false;
    }

    private static boolean isSynchronousRestTask(FlowNode node) {
        return "SERVICE_TASK".equals(node.type()) && node.connectorConfig() != null
                && "REST".equalsIgnoreCase(node.connectorConfig().connectorType());
    }

    private static boolean isCheckpoint(FlowNode node) {
        if ("USER_TASK".equals(node.type()) || "RECEIVE_TASK".equals(node.type())) {
            return true;
        }
        // A SERVICE_TASK not using the native REST connector goes through the external-task pattern
        // (Kafka, or no connector at all) — Camunda pauses there waiting for a worker, same as RECEIVE_TASK.
        return "SERVICE_TASK".equals(node.type()) && !isSynchronousRestTask(node);
    }
}
