package com.jouney.admin.interfaces.flow;

import com.jouney.admin.domain.flow.FlowSection;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;

public record FlowSectionInput(
        @NotBlank String id,
        @NotBlank @Size(max = 80) String name,
        // Pode ser vazia: uma moldura recém-criada ainda não tem etapa dentro.
        List<String> nodeIds,
        Integer x,
        Integer y,
        @Positive Integer width,
        @Positive Integer height) {

    public FlowSection toDomain() {
        return new FlowSection(id, name.trim(), nodeIds != null ? nodeIds : List.of(), x, y, width, height);
    }
}
