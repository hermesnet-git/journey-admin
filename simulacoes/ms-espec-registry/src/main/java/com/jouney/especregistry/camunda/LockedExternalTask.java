package com.jouney.especregistry.camunda;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/** Uma linha da resposta de {@code POST /external-task/fetchAndLock} — os nomes dos campos batem
 * direto com o JSON do Camunda, sem precisar de DTO intermediário. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record LockedExternalTask(String id, String topicName, String processInstanceId, String businessKey,
                                  String activityId) {
}
