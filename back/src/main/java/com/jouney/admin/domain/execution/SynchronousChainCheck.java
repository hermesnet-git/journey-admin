package com.jouney.admin.domain.execution;

import com.jouney.admin.domain.flow.ConnectorConfig;
import com.jouney.admin.domain.flow.ConnectorType;
import com.jouney.admin.domain.flow.FlowConnection;
import com.jouney.admin.domain.flow.FlowNode;
import com.jouney.admin.domain.flow.FlowNodeType;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Detecta, a partir do fluxo publicado, se algum END é alcançado só por Service Tasks via REST
 * (sempre síncronas), sem nenhum ponto de parada antes — não é uma regra de validação estrutural em
 * tempo de design (é comportamento normal do motor, não uma jornada mal formada), só uma checagem
 * em tempo de execução pra explicar ao usuário por que uma instância não inicia/avança, em vez de
 * deixar o motor crashar sem explicação nenhuma. Porta de {@code ms-espec-registry}'s
 * {@code SynchronousChainCheck} pra dentro de admin/back, chamada antes de iniciar, completar tarefa
 * ou pular etapa (REQ-05.08.005) — o caminho do canal digital (ms-journey → ms-espec-registry) já
 * tinha essa proteção; faltava na própria tela de Execução do Admin Portal. */
public final class SynchronousChainCheck {

    private SynchronousChainCheck() {
    }

    public static void verify(List<FlowNode> flowNodes, List<FlowConnection> flowConnections) {
        Map<String, FlowNode> byId = new HashMap<>();
        flowNodes.forEach(n -> byId.put(n.getId(), n));
        Map<String, List<String>> backward = new HashMap<>();
        for (FlowConnection c : flowConnections) {
            backward.computeIfAbsent(c.getTargetNodeId(), k -> new ArrayList<>()).add(c.getSourceNodeId());
        }
        for (FlowNode node : flowNodes) {
            if (node.getType() == FlowNodeType.END && reachesEndWithoutCheckpoint(node, backward, byId)) {
                throw new SynchronousChainUnsupportedException(node.getName());
            }
        }
    }

    private static boolean reachesEndWithoutCheckpoint(FlowNode end, Map<String, List<String>> backward,
                                                         Map<String, FlowNode> byId) {
        Set<String> seen = new HashSet<>();
        Deque<String> queue = new ArrayDeque<>();
        seen.add(end.getId());
        queue.add(end.getId());
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
                continue; // o motor pausa aqui (User Task, ou um nó de external task aguardando um worker) — não olha mais pra trás através dele
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
        ConnectorConfig config = node.getConnectorConfig();
        return node.getType() == FlowNodeType.SERVICE_TASK && config != null && config.getConnectorType() == ConnectorType.REST;
    }

    private static boolean isCheckpoint(FlowNode node) {
        if (node.getType() == FlowNodeType.USER_TASK || node.getType() == FlowNodeType.RECEIVE_TASK) {
            return true;
        }
        // Uma SERVICE_TASK que não usa o conector REST nativo passa pelo padrão de external task
        // (Kafka, Event Hubs, Service Bus) — o motor pausa aí esperando um worker, igual RECEIVE_TASK.
        return node.getType() == FlowNodeType.SERVICE_TASK && !isSynchronousRestTask(node);
    }
}
