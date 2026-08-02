package com.jouney.admin.interfaces.flow;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record FlowInput(
        @NotBlank @Size(max = 200) String name,
        @NotNull @Valid List<FlowNodeInput> nodes,
        @NotNull @Valid List<FlowConnectionInput> connections) {
}
