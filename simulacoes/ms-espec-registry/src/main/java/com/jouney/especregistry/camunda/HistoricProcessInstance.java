package com.jouney.especregistry.camunda;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/** Uma entrada de {@code GET /history/process-instance} (ou {@code /history/process-instance/{id}})
 * — existe pra instâncias em qualquer estado, ativa ou já terminada, ao contrário do endpoint de
 * runtime {@code /process-instance} usado por {@link ProcessInstanceInfo}. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record HistoricProcessInstance(String id, String businessKey, String processDefinitionId,
                                       String processDefinitionKey, String processDefinitionName,
                                       Integer processDefinitionVersion, String startTime, String endTime,
                                       Long durationInMillis, String state) {
}
