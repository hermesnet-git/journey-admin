package com.jouney.journey.especregistry;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.UUID;
import java.util.Map;

// sdui é passthrough opaco (catálogo SDUI corporativo v1 — nó-objeto, não mais tupla
// [tag,props,children]) — este serviço nunca interpreta a árvore, só repassa pro canal digital/BFF.
@JsonIgnoreProperties(ignoreUnknown = true)
public record FormPayload(UUID id, String name, String description, Object sdui, Map<String, Object> context) {
}
