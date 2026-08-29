package com.jouney.especregistry.simulation;

import java.util.Map;

/** Um nó que a instância visitou, do início ao fim, com o que ele recebeu ({@code input}) e produziu
 * ({@code output}) — USER_TASK: input = respostas submetidas no form; SERVICE_TASK/RECEIVE_TASK REST:
 * input = {method,url,headers,body}, output = {response}; conector Kafka: input = {topic,payload},
 * sem output (o worker não aguarda resposta). START/END/GATEWAY e nós sem correspondência no
 * snapshot resolvido: sem input/output, só nome/tipo/tempos. */
public record HistoryStep(String nodeId, String nodeName, String nodeType, String startTime, String endTime,
                           Long durationMillis, Map<String, Object> input, Map<String, Object> output) {
}
