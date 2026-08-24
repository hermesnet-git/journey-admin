package com.jouney.especregistry.camunda;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/** Uma entrada de {@code GET /history/variable-instance} — mesmo trio name/value/type do endpoint de
 * runtime ({@code /process-instance/{id}/variables}), só que também resolve pra instâncias já
 * terminadas (ver {@link CamundaClient#getProcessVariables}). {@code activityInstanceId} distingue
 * uma variável de escopo do processo (igual ao próprio processInstanceId — convenção do Camunda pra
 * execução raiz) de uma variável local a um nó específico (ex.: url/method/headers/payload/response
 * que HttpConnectorDelegate grava por Service Task) — {@link CamundaClient#getHistoricProcessVariables}
 * usa isso pra nunca misturar as duas. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record HistoricVariableInstance(String name, Object value, String type, String activityInstanceId) {
}
