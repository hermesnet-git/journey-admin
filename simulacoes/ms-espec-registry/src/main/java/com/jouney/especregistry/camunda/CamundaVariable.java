package com.jouney.especregistry.camunda;

/** Formato de variável tipada da REST API do Camunda: {"value": ..., "type": "String"|"Double"|"Boolean"}. */
public record CamundaVariable(Object value, String type) {
}
