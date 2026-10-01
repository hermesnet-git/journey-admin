package com.jouney.admin.interfaces.flow;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

public record FlowInput(
        @NotBlank @Size(max = 200) String name,
        @NotNull @Valid List<FlowNodeInput> nodes,
        @NotNull @Valid List<FlowConnectionInput> connections,
        @NotNull @Valid List<FlowAnnotationInput> annotations,
        // Modo de exibição em que as posições foram organizadas no editor; opcional.
        @Pattern(regexp = "circle|compact|detailed") String layoutMode,
        // Seções do canvas; ausente equivale a nenhuma.
        @Valid List<FlowSectionInput> sections) {
}
