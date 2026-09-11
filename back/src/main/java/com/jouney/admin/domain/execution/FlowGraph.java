package com.jouney.admin.domain.execution;

import com.jouney.admin.domain.flow.FlowConnection;
import com.jouney.admin.domain.flow.FlowNode;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/** Travessia da árvore de nós de uma versão publicada — hoje só um caso de uso: achar o próximo nó
 * com conector a partir de um ponto do fluxo (heurística de atribuição de erro, ver
 * {@link com.jouney.admin.application.execution.CompleteExecutionTask}). */
public final class FlowGraph {

    private FlowGraph() {
    }

    // A transação da engine dá rollback inteira quando um conector falha no meio da continuação —
    // nada avança, e nada fica registrado no histórico pro nó que efetivamente falhou. Como estes
    // fluxos nunca têm paralelismo real, o próximo nó com conector a partir do passo atual é a
    // melhor hipótese de onde a falha aconteceu (é o único tipo de nó capaz de lançar esse erro).
    public static Optional<FlowNode> nextConnectorNodeAfter(String nodeId, List<FlowNode> nodes,
                                                              List<FlowConnection> connections) {
        Map<String, FlowNode> byId = nodes.stream().collect(java.util.stream.Collectors.toMap(FlowNode::getId, n -> n));
        Set<String> visited = new HashSet<>();
        Deque<String> queue = new ArrayDeque<>();
        visited.add(nodeId);
        queue.add(nodeId);
        while (!queue.isEmpty()) {
            String current = queue.poll();
            for (FlowConnection c : connections) {
                if (!c.getSourceNodeId().equals(current)) {
                    continue;
                }
                FlowNode next = byId.get(c.getTargetNodeId());
                if (next == null) {
                    continue;
                }
                if (next.getConnectorConfig() != null) {
                    return Optional.of(next);
                }
                if (visited.add(next.getId())) {
                    queue.add(next.getId());
                }
            }
        }
        return Optional.empty();
    }
}
