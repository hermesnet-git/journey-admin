package com.jouney.admin.domain.flow;

import com.jouney.admin.domain.channel.ChannelType;
import java.util.List;
import java.util.UUID;

// Catálogo entregue a um AiFlowGenerator pra que ele só referencie entidades reais (formulários,
// conectores) em vez de inventar ids — espelha o que um designer humano já vê no canvas/paleta.
public record GenerationContext(String prompt, String journeyName, String journeyDescription, String productName,
                                 String channelName, ChannelType channelType, List<ConnectorType> enabledConnectors,
                                 List<FormSummary> forms) {

    // fieldNames já exclui campos TEXT/FILE_UPLOAD, mesmo filtro que o UpdateFlow aplica ao resolver
    // quais campos de formulário viram referências {{variavel}} (ver UpdateFlow.formFieldNamesByFormId).
    public record FormSummary(UUID id, String name, List<String> fieldNames) {
    }
}
