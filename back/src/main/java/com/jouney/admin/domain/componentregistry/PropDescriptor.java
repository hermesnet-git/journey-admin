package com.jouney.admin.domain.componentregistry;

import java.util.List;

/** Descreve uma propriedade do schema de um componente (seção 7 do catálogo). {@code tokenGroup}
 * só é relevante quando {@code kind == TOKEN} (ex.: "color", "spacing" — ver seção 10); {@code
 * enumValues} só quando {@code kind == ENUM}. */
public record PropDescriptor(String name, PropKind kind, boolean required, Object defaultValue, String tokenGroup,
                              List<String> enumValues) {
}
