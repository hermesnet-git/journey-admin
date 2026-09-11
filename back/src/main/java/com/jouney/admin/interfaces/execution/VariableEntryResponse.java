package com.jouney.admin.interfaces.execution;

import com.jouney.admin.application.execution.RuntimeExecutionPort.TypedVariable;
import java.util.List;
import java.util.Map;

public record VariableEntryResponse(String name, Object value, String type) {

    public static List<VariableEntryResponse> from(Map<String, TypedVariable> variables) {
        return variables.entrySet().stream()
                .map(e -> new VariableEntryResponse(e.getKey(), e.getValue().value(), e.getValue().type()))
                .toList();
    }
}
