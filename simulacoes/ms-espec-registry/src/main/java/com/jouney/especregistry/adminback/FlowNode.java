package com.jouney.especregistry.adminback;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = true)
public record FlowNode(String id, String type, String name, int positionX, int positionY, UUID formId,
                        ConnectorConfig connectorConfig, List<Map<String, Object>> startVariables) {

    /** REQ-03.12.001: {name, type} declarações no nó START — nunca null no uso, mesmo que o JSON não traga o campo. */
    public List<Map<String, Object>> startVariables() {
        return startVariables != null ? startVariables : List.of();
    }
}
