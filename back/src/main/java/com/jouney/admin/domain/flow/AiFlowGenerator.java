package com.jouney.admin.domain.flow;

import java.util.function.Consumer;

// Porta pro "gerar fluxo por prompt" da FT-03: cada implementação é dona do próprio loop de correção
// (chamar o modelo, validar o candidato via FlowValidator, pedir pro modelo corrigir violações,
// repetir) e só pode devolver um GeneratedFlow já válido — nunca um estruturalmente quebrado.
// onProgress recebe uma linha de texto por tentativa (pro usuário acompanhar em tempo real no
// modal do designer, via SSE) — implementações devem chamá-lo antes/depois de cada tentativa.
public interface AiFlowGenerator {

    GeneratedFlow generate(GenerationContext context, Consumer<String> onProgress);
}
