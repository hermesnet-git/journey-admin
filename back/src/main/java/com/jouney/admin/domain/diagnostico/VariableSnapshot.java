package com.jouney.admin.domain.diagnostico;

/** Valor atual/final de uma variável de processo (escopo global) — aba Variáveis do Diagnóstico. */
public record VariableSnapshot(String name, Object value, String type) {
}
