package com.jouney.admin.domain.flow;

// nodeId é null quando a violação não é sobre uma etapa específica (ex.: contagem de elementos
// iniciais/finais da jornada como um todo) — usado pelo front pra destacar no canvas exatamente a
// etapa com problema, em vez de só listar o texto na modal de "Jornada inconsistente".
public record FlowViolation(String nodeId, String message) {

    public FlowViolation(String message) {
        this(null, message);
    }
}
