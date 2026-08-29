package com.jouney.journey.camunda;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record TaskInfo(String id, String name, String taskDefinitionKey) {
}
