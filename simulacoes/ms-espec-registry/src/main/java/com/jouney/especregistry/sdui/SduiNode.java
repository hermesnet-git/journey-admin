package com.jouney.especregistry.sdui;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import java.util.Map;

/** Espelha o domain/sdui/SduiNode do admin/back — {id,type,version,props,bindings,events,
 * visibility,children} do catálogo SDUI corporativo v1. Substitui a tupla [tag,props,children] que
 * este serviço usava antes (SduiTemplateResolver/SduiForm/VariableConversion). */
@JsonIgnoreProperties(ignoreUnknown = true)
public record SduiNode(String id, String type, String version, Map<String, Object> props,
                        Map<String, SduiBinding> bindings, Map<String, SduiEvent> events,
                        SduiVisibility visibility, List<SduiNode> children) {
}
