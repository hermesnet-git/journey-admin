package com.jouney.especregistry.simulation;

/** Uma linha da busca de instâncias históricas (aba Histórico da tela Execução & Diagnóstico). */
public record HistoricInstanceSummary(String id, String businessKey, String journeyName, String startTime,
                                       String endTime, Long durationMillis, String state) {
}
