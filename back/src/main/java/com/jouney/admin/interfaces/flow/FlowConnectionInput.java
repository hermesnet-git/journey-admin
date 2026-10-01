package com.jouney.admin.interfaces.flow;

import com.jouney.admin.domain.flow.FlowConnection;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record FlowConnectionInput(
        @NotBlank @Pattern(regexp = "^Flow_.+") String connectionId,
        @NotBlank @Pattern(regexp = "^Node_.+") String sourceNodeId,
        @NotBlank @Pattern(regexp = "^Node_.+") String targetNodeId,
        String condition,
        boolean isDefault,
        // Saída "Se falhar" de uma integração REST.
        boolean onError,
        // Rótulo opcional da ligação, escrito pelo autor (só apresentação).
        @Size(max = 40) String label) {

    public FlowConnection toDomain() {
        String trimmed = label == null || label.isBlank() ? null : label.trim();
        return new FlowConnection(connectionId, sourceNodeId, targetNodeId, condition, isDefault, onError, trimmed);
    }
}
