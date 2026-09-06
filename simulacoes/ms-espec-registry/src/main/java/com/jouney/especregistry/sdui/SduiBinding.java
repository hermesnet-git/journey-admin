package com.jouney.especregistry.sdui;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record SduiBinding(String path, String mode) {
}
