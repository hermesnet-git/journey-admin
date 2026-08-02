package com.jouney.admin.interfaces.flow;

import com.jouney.admin.domain.flow.FlowNode;
import com.jouney.admin.domain.flow.FlowNodeType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.util.UUID;

public record FlowNodeInput(
        @NotBlank @Pattern(regexp = "^Node_.+") String nodeId,
        @NotNull FlowNodeType nodeType,
        @NotBlank String name,
        String description,
        @NotNull Integer positionX,
        @NotNull Integer positionY,
        @Valid UserTaskConfigInput userTaskConfig) {

    public FlowNode toDomain() {
        UUID formId = userTaskConfig != null ? userTaskConfig.formId() : null;
        return new FlowNode(nodeId, nodeType, name, description, positionX, positionY, formId);
    }
}
