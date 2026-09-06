package com.jouney.especregistry.sdui;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record SduiVisibility(String rule, String path, Object value) {
}
