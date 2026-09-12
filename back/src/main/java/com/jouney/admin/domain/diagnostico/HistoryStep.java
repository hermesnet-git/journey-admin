package com.jouney.admin.domain.diagnostico;

import com.jouney.admin.application.execution.RuntimeExecutionPort.ExternalTaskAttempt;
import com.jouney.admin.application.execution.RuntimeExecutionPort.TaskDetail;
import java.util.List;
import java.util.Map;

/** Um nó visitado por uma instância (histórico completo, do início ao fim) com o que ele recebeu/
 * produziu — mapa de campos por tipo de nó: REST (method/url/headers/body no input, response +
 * statusCode no output), Kafka (topic/payload no input), USER_TASK (respostas submetidas no
 * input). {@code taskDetail} só vem preenchido pra USER_TASK; {@code attempts} só pra Service/
 * Receive Task Kafka (external task) — os dois vêm {@code null}/vazio pra qualquer outro tipo.
 * {@code canceled} vale pra qualquer tipo de nó. {@code activityInstanceId} também vale pra
 * qualquer tipo de nó (é o id da própria activity instance no motor, sempre existe pra um passo já
 * executado) — serve de identificador genérico pra correlacionar com o motor quando o nó não é uma
 * User Task (que tem seu próprio {@code taskDetail.taskId}, diferente deste). Os dois tipos
 * reaproveitados são os mesmos do {@link com.jouney.admin.application.execution.RuntimeExecutionPort}
 * (sem twin de domínio) porque nenhuma transformação acontece entre um e outro — só repasse. */
public record HistoryStep(String nodeId, String nodeName, String nodeType, String startTime, String endTime,
                           Long durationMillis, Map<String, Object> input, Map<String, Object> output,
                           TaskDetail taskDetail, List<ExternalTaskAttempt> attempts, boolean canceled,
                           String activityInstanceId) {
}
