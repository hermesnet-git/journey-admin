package com.jouney.especregistry.adminback;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ConnectorConfig(String connectorType, Map<String, Object> config) {

    /** REQ-03.09.010: lista de regras {name, jsonPath, type} declarada em config.outputMapping. */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> outputMapping() {
        if (config == null || !(config.get("outputMapping") instanceof List<?> list)) {
            return List.of();
        }
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object item : list) {
            if (item instanceof Map<?, ?> map) {
                result.add((Map<String, Object>) map);
            }
        }
        return result;
    }
}
