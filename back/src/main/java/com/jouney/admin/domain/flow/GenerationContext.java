package com.jouney.admin.domain.flow;

import com.jouney.admin.domain.channel.ChannelType;
import java.util.List;

// Catálogo entregue a um AiFlowGenerator pra que ele só referencie entidades reais (conectores) em
// vez de inventar ids — espelha o que um designer humano já vê no canvas/paleta. A geração só
// acontece ao criar uma jornada (aba "IA" de "Nova jornada"), que nasce vazia: não há fluxo atual
// para considerar.
public record GenerationContext(String prompt, String journeyName, String journeyDescription, String productName,
                                 ChannelType channelType, List<ConnectorType> enabledConnectors) {
}
