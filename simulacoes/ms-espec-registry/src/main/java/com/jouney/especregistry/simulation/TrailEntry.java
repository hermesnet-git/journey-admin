package com.jouney.especregistry.simulation;

/** Um nó que o motor executou sozinho (sem parar) a caminho do novo passo — mesmo formato de tipo
 * usado em {@link com.jouney.especregistry.adminback.FlowNode#type()} (SERVICE_TASK, GATEWAY, END...).
 * {@code url}/{@code response}/{@code method}/{@code requestHeaders}/{@code requestBody} só vêm
 * preenchidos para um SERVICE_TASK com conector REST — capturados pelo BpmnTransformer
 * (ms-transform-publication) em variáveis de processo com nome reservado (prefixo por nó), já que a
 * variável local "response" do conector é sobrescrita a cada integração. {@code requestHeaders}/
 * {@code requestBody} vêm ausentes (null) quando o conector não os configurou (ex.: GET sem corpo).
 * {@code kafkaTopic}/{@code kafkaPayload} são o equivalente pro conector Kafka — gravados por
 * {@link com.jouney.especregistry.kafka.KafkaMessagePublisher#completionVariables} ao completar a
 * external task, tanto pelo worker automático quanto pelo envio manual. */
public record TrailEntry(String nodeId, String nodeName, String nodeType, String url, String response,
                          String method, String requestHeaders, String requestBody,
                          String kafkaTopic, String kafkaPayload) {
}
