package com.jouney.admin.interfaces.flow;

import com.jouney.admin.domain.flow.FlowAnnotation;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record FlowAnnotationInput(
        @NotBlank String id,
        String text,
        @NotNull Integer positionX,
        @NotNull Integer positionY,
        List<String> linkedNodeIds) {

    public FlowAnnotation toDomain() {
        return new FlowAnnotation(id, text, positionX, positionY, linkedNodeIds != null ? linkedNodeIds : List.of());
    }
}
