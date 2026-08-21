package com.jouney.admin.interfaces.messaging;

import com.jouney.admin.domain.messaging.ClusterType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ClusterInput(
        @NotBlank @Size(max = 150) String name,
        @NotNull ClusterType type,
        @NotBlank @Size(max = 300) String connectionAddress) {
}
