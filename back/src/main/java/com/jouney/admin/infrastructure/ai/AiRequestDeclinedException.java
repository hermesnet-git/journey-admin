package com.jouney.admin.infrastructure.ai;

// A IA decidiu não gerar um fluxo porque o pedido do usuário não tinha nenhuma relação com desenhar
// uma jornada (chamou decline_request em vez de generate_flow) — distinto de AiGenerationException
// (falha técnica na chamada) e de FlowValidationException (tentou gerar, saiu estruturalmente
// inválido). Não participa do loop de correção: não faz sentido tentar de novo o mesmo pedido.
public class AiRequestDeclinedException extends RuntimeException {

    public AiRequestDeclinedException(String reason) {
        super(reason);
    }
}
