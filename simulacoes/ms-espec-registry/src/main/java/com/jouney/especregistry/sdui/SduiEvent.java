package com.jouney.especregistry.sdui;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public record SduiEvent(String action, Map<String, Object> params) {
}
