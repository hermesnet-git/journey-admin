package com.jouney.especregistry.domain.engine;

/** Formato de variável tipada do Runtime Engine: {"value": ..., "type": "String"|"Double"|"Boolean"}. */
public record EngineVariable(Object value, String type) {
}
