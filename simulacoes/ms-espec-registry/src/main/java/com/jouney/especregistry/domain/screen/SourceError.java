package com.jouney.especregistry.domain.screen;

/** Fonte de dados de referência que falhou ao montar a tela (ADR-002): a mensagem configurada pelo
 * autor e se a fonte é obrigatória — obrigatória bloqueia a etapa e oferece "Tentar novamente". */
public record SourceError(String message, boolean required) {
}
