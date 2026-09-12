package com.jouney.admin.domain.execution;

/** Um nó que o motor atravessou sozinho (SERVICE_TASK/GATEWAY, sem parar pro usuário) entre uma
 * ação e a próxima — sem isso esses nós nunca apareceriam como visitados no diagrama, mesmo tendo
 * rodado de verdade na mesma transação. Campos de conector só preenchidos pra SERVICE_TASK, e só
 * os do tipo em questão (REST: url/method/headers/response; Kafka: topic/payload).
 * {@code activityInstanceId} vale pra qualquer tipo de nó (id da própria activity instance,
 * sempre existe pra um passo concluído); {@code endTime}, idem. {@code taskId} só existe pra
 * USER_TASK (id real da tarefa no motor, via {@code /history/task} — diferente de
 * activityInstanceId). Mesmo modelo do Diagnóstico ({@code HistoryStep}), aqui só pra alimentar o
 * cabeçalho do drawer de nó da Execução ao vivo com a mesma informação (não a aba Variáveis). */
public record TrailEntry(String nodeId, String nodeName, String nodeType, String url, String response,
                          String method, String requestHeaders, String requestBody, String kafkaTopic,
                          String kafkaPayload, String activityInstanceId, String endTime, String taskId) {
}
