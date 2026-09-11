package com.jouney.admin.domain.diagnostico;

/** Uma linha da busca de histórico (Diagnóstico) — instância em qualquer estado, ativa ou já
 * terminada. {@code version} é a versão do process-definition do motor (não necessariamente igual
 * ao número de versão de negócio), só pra agrupar visualmente. */
public record HistoricInstanceEntry(String id, String businessKey, String journeyName, Integer version,
                                     String startTime, String endTime, Long durationMillis, String state,
                                     String channel) {
}
