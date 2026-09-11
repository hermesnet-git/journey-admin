package com.jouney.admin.domain.execution;

import java.util.Map;

/** Um nó visitado por uma instância (histórico completo, do início ao fim) com o que ele recebeu/
 * produziu — mapa de campos por tipo de nó: REST (method/url/headers/body no input, response no
 * output), Kafka (topic/payload no input), USER_TASK (respostas submetidas no input). */
public record HistoryStep(String nodeId, String nodeName, String nodeType, String startTime, String endTime,
                           Long durationMillis, Map<String, Object> input, Map<String, Object> output) {
}
