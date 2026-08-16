package com.jouney.especregistry.adminback;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = true)
public record FlowNode(String id, String type, String name, int positionX, int positionY, UUID formId,
                        ConnectorConfig connectorConfig) {
}
