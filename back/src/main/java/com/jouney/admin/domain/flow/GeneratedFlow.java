package com.jouney.admin.domain.flow;

import java.util.List;

// Resultado de uma chamada a AiFlowGenerator (geração de jornada por prompt): já validado pelo
// gerador contra o FlowValidator — nunca é persistido diretamente, só oferecido ao front, que
// organiza as posições e salva como qualquer outra alteração (ver GenerateFlow). As anotações levam
// o que o autor ainda precisa completar (mensageria, endereço de API) e as seções agrupam etapas.
public record GeneratedFlow(String name, List<FlowNode> nodes, List<FlowConnection> connections,
                            List<FlowAnnotation> annotations, List<FlowSection> sections) {
}
