package com.jouney.especregistry.simulation;

/** Uma linha da busca de instâncias históricas (tela Diagnóstico). {@code version} é o
 * processDefinitionVersion do Camunda (já vem de graça na busca, sem custo extra de chamada) — usado
 * só pra agrupar execuções por versão de jornada na lista, não é necessariamente o mesmo número da
 * versão de negócio (versionTag) resolvida em {@link InstanceHistoryResponse}. */
public record HistoricInstanceSummary(String id, String businessKey, String journeyName, Integer version,
                                       String startTime, String endTime, Long durationMillis, String state) {
}
