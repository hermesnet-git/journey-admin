package com.jouney.especregistry.simulation;

import java.util.List;

/** Resultado de {@link StartFailureDiagnostic} — ou {@code confirmed} aponta exatamente o nó/campo
 * cujo jsonPath de Mapeamento de Saída não bateu com a resposta real (replay da cadeia síncrona
 * reproduziu a falha), ou, quando a cadeia inteira roda sem reproduzir o erro (ex.: resposta mudou
 * entre tentativas), {@code suspectNodeNames} lista os nós candidatos sem confirmação. */
public record DiagnosisResult(boolean confirmed, String nodeId, String nodeName, String field, String jsonPath,
                               String reason, String responseSnippet, List<String> suspectNodeNames) {

    static DiagnosisResult confirmed(String nodeId, String nodeName, String field, String jsonPath, String reason,
                                      String responseSnippet) {
        return new DiagnosisResult(true, nodeId, nodeName, field, jsonPath, reason, responseSnippet, List.of());
    }

    static DiagnosisResult suspects(List<String> suspectNodeNames) {
        return new DiagnosisResult(false, null, null, null, null, null, null, suspectNodeNames);
    }
}
