package com.jouney.admin.interfaces.product;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ProductInput(
        @NotBlank @Size(max = 150) String name,
        @NotBlank String description) {
}
