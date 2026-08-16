package com.jouney.especregistry.adminback;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import java.util.UUID;

/** {@code sdui} é a árvore hyperscript [tag, props, children] gerada por FormSduiSerializer
 * no admin/back — repassada ao simulador tal como está, sem reinterpretação. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record FormSnapshot(UUID id, String name, String description, List<Object> sdui) {
}
