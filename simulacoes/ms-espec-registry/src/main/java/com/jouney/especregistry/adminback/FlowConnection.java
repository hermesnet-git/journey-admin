package com.jouney.especregistry.adminback;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record FlowConnection(String id, String sourceNodeId, String targetNodeId, String condition, boolean isDefault) {
}
