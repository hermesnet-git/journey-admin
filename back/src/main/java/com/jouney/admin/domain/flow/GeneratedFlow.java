package com.jouney.admin.domain.flow;

import java.util.List;

// Resultado de uma chamada a AiFlowGenerator (FT-03, geração de fluxo por prompt): já validado pelo
// gerador contra o FlowValidator — nunca é persistido diretamente, só oferecido ao canvas do designer
// como preview, que o usuário revisa/edita/salva como qualquer outra alteração (ver GenerateFlow).
public record GeneratedFlow(String name, List<FlowNode> nodes, List<FlowConnection> connections) {
}
