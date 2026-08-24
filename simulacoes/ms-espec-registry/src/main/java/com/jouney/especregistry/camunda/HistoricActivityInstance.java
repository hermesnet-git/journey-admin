package com.jouney.especregistry.camunda;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record HistoricActivityInstance(String id, String activityId, String activityName, String activityType, String endTime) {
}
