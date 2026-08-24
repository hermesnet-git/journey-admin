package com.jouney.especregistry.adminback;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/** Mapeia só os campos usados do PublicationSnapshotRecord do admin/back
 * (GET /api/v1/journeys/{id}/publication). Uma User Task nunca referencia um Form por id — a tela
 * dela já vem compilada (FlowNode.embeddedScreenSdui), então não há "forms" pra resolver aqui. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record PublicationSnapshot(UUID journeyId, String journeyName, String channelType, List<FlowNode> flowNodes,
                                   List<FlowConnection> flowConnections) {

    public Optional<FlowNode> findNode(String nodeId) {
        return flowNodes.stream().filter(n -> n.id().equals(nodeId)).findFirst();
    }

    /** Nó de início do fluxo — START comum ou MESSAGE_START_EVENT (REQ-03.07.005: sempre exatamente um). */
    public Optional<FlowNode> findStartNode() {
        return flowNodes.stream()
                .filter(n -> "START".equals(n.type()) || "MESSAGE_START_EVENT".equals(n.type()))
                .findFirst();
    }

    /** Segue as conexões de saída a partir de {@code nodeId} até achar o primeiro nó com conector
     * (SERVICE_TASK/RECEIVE_TASK/MESSAGE_START_EVENT) — o único tipo capaz de falhar de verdade numa
     * transação da engine. Usado quando um /complete ou /simulate-step falha: a transação inteira dá
     * rollback antes de qualquer histórico ser gravado, então a engine não expõe diretamente qual nó
     * causou o erro.
     *
     * BFS por TODOS os ramos (não só o primeiro), com conjunto de visitados — não dá pra assumir um
     * caminho único e determinístico como antes: um GATEWAY tem duas saídas possíveis, e se a saída
     * "errada" (a que não falhou) volta a um nó já visitado mais cedo no fluxo (loop de verdade, ex.:
     * "ramo A leva de volta pra uma User Task anterior"), o walk linear antigo (só `.findFirst()`,
     * sem marcar visitados) ficava girando nesse ciclo até estourar o orçamento de iterações sem
     * nunca chegar no outro ramo — devolvendo vazio mesmo com um conector real mais à frente. */
    public Optional<FlowNode> nextConnectorNodeAfter(String nodeId) {
        Set<String> visited = new HashSet<>();
        Deque<String> queue = new ArrayDeque<>();
        visited.add(nodeId);
        queue.add(nodeId);
        while (!queue.isEmpty()) {
            String current = queue.poll();
            for (FlowConnection c : flowConnections) {
                if (!c.sourceNodeId().equals(current)) {
                    continue;
                }
                Optional<FlowNode> next = findNode(c.targetNodeId());
                if (next.isEmpty()) {
                    continue;
                }
                if (next.get().connectorConfig() != null) {
                    return next;
                }
                if (visited.add(next.get().id())) {
                    queue.add(next.get().id());
                }
            }
        }
        return Optional.empty();
    }
}
