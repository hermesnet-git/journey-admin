package com.jouney.especregistry.adminback;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Mapeia só os campos usados do PublicationSnapshotRecord do admin/back
 * (GET /api/v1/journeys/{id}/publication). */
@JsonIgnoreProperties(ignoreUnknown = true)
public record PublicationSnapshot(UUID journeyId, String journeyName, String channelType, List<FlowNode> flowNodes,
                                   List<FlowConnection> flowConnections, List<FormSnapshot> forms) {

    public Optional<FlowNode> findNode(String nodeId) {
        return flowNodes.stream().filter(n -> n.id().equals(nodeId)).findFirst();
    }

    public Optional<FormSnapshot> findForm(UUID formId) {
        return forms.stream().filter(f -> f.id().equals(formId)).findFirst();
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
     * causou o erro — mas como nossos fluxos nunca têm paralelismo, o caminho a partir do passo atual
     * até o próximo conector é sempre determinístico. */
    public Optional<FlowNode> nextConnectorNodeAfter(String nodeId) {
        String currentId = nodeId;
        for (int i = 0; i < flowNodes.size() && currentId != null; i++) {
            String from = currentId;
            Optional<FlowNode> next = flowConnections.stream()
                    .filter(c -> c.sourceNodeId().equals(from))
                    .findFirst()
                    .flatMap(c -> findNode(c.targetNodeId()));
            if (next.isEmpty()) {
                return Optional.empty();
            }
            if (next.get().connectorConfig() != null) {
                return next;
            }
            currentId = next.get().id();
        }
        return Optional.empty();
    }
}
