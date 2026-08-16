package com.jouney.especregistry.simulation;

/** Tipos aceitos vindos do front: "String", "Double", "Boolean" — mesmos nomes que o Camunda usa. */
public record SetVariableRequest(Object value, String type) {
}
