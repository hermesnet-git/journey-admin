package com.jouney.admin.domain.flow;

import com.jouney.admin.domain.channel.ChannelType;
import java.util.List;

// Catálogo entregue a um AiFlowGenerator pra que ele só referencie entidades reais (conectores) em
// vez de inventar ids — espelha o que um designer humano já vê no canvas/paleta.
// currentFlowNodes/currentFlowConnections: o fluxo já desenhado no canvas ANTES deste pedido (vazio
// numa jornada nova) — sem isto, todo pedido parecia "desenhe do zero" pra IA, mesmo um aditivo como
// "adicione uma tarefa", porque ela nunca via o que já existia (ver FlowGenerationPrompt).
public record GenerationContext(String prompt, String journeyName, String journeyDescription, String productName,
                                 String channelName, ChannelType channelType, List<ConnectorType> enabledConnectors,
                                 List<FlowNode> currentFlowNodes, List<FlowConnection> currentFlowConnections) {
}
