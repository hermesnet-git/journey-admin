package com.jouney.admin.interfaces.flow;

import com.jouney.admin.domain.flow.FlowSection;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

public record FlowSectionInput(
        @NotBlank String id,
        @NotBlank @Size(max = 80) String name,
        @NotEmpty List<String> nodeIds) {

    public FlowSection toDomain() {
        return new FlowSection(id, name.trim(), nodeIds);
    }
}
