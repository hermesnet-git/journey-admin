package com.jouney.admin.interfaces.flow;

import com.jouney.admin.domain.flow.FlowNode;
import com.jouney.admin.domain.flow.FlowNodeType;
import com.jouney.admin.domain.form.FormField;
import com.jouney.admin.interfaces.form.FormFieldInput;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.util.List;
import java.util.Map;

public record FlowNodeInput(
        @NotBlank @Pattern(regexp = "^Node_.+") String nodeId,
        @NotNull FlowNodeType nodeType,
        @NotBlank String name,
        String description,
        @NotNull Integer positionX,
        @NotNull Integer positionY,
        @Valid UserTaskConfigInput userTaskConfig,
        @Valid ConnectorConfigInput connectorConfig,
        // REQ-03.12.001: {name, type} declarations, valid only on the START node — the variables the
        // caller (canal digital/BFF) must supply when starting an instance.
        List<Map<String, Object>> startVariables) {

    public FlowNode toDomain() {
        String messageText = userTaskConfig != null ? userTaskConfig.messageText() : null;
        List<FormField> embeddedScreen = userTaskConfig != null && userTaskConfig.embeddedScreen() != null
                ? userTaskConfig.embeddedScreen().stream().map(FormFieldInput::toDomain).toList()
                : List.of();
        return new FlowNode(nodeId, nodeType, name, description, positionX, positionY,
                connectorConfig != null ? connectorConfig.toDomain() : null, startVariables, messageText,
                embeddedScreen, null);
    }
}
