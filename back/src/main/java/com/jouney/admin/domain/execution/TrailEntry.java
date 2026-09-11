package com.jouney.admin.domain.execution;

/** Um nó que o motor atravessou sozinho (SERVICE_TASK/GATEWAY, sem parar pro usuário) entre uma
 * ação e a próxima — sem isso esses nós nunca apareceriam como visitados no diagrama, mesmo tendo
 * rodado de verdade na mesma transação. Campos de conector só preenchidos pra SERVICE_TASK, e só
 * os do tipo em questão (REST: url/method/headers/response; Kafka: topic/payload). */
public record TrailEntry(String nodeId, String nodeName, String nodeType, String url, String response,
                          String method, String requestHeaders, String requestBody, String kafkaTopic,
                          String kafkaPayload) {
}
