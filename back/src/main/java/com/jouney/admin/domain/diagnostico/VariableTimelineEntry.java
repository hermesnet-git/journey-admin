package com.jouney.admin.domain.diagnostico;

/** Uma mudança de valor de uma variável de processo, com o nó onde aconteceu — timeline completa
 * usada pela aba Variáveis do Diagnóstico pra mostrar todos os valores que a variável já teve.
 * {@code nodeId}/{@code nodeName} vêm nulos quando a mudança aconteceu fora de um nó resolvido na
 * versão do fluxo (deploy legado sem correlação, mesmo caso já tratado em {@link HistoryStep}). */
public record VariableTimelineEntry(String name, Object value, String type, String nodeId, String nodeName,
                                     String time) {
}
