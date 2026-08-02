package com.jouney.admin.interfaces.flow;

import com.jouney.admin.domain.flow.FlowConnection;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record FlowConnectionInput(
        @NotBlank @Pattern(regexp = "^Flow_.+") String connectionId,
        @NotBlank @Pattern(regexp = "^Node_.+") String sourceNodeId,
        @NotBlank @Pattern(regexp = "^Node_.+") String targetNodeId) {

    public FlowConnection toDomain() {
        return new FlowConnection(connectionId, sourceNodeId, targetNodeId);
    }
}
