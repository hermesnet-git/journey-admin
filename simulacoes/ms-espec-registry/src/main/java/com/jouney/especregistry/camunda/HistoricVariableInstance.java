package com.jouney.especregistry.camunda;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/** Uma entrada de {@code GET /history/variable-instance} — mesmo trio name/value/type do endpoint de
 * runtime ({@code /process-instance/{id}/variables}), só que também resolve pra instâncias já
 * terminadas (ver {@link CamundaClient#getProcessVariables}). */
@JsonIgnoreProperties(ignoreUnknown = true)
public record HistoricVariableInstance(String name, Object value, String type) {
}
