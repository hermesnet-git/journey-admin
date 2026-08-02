package com.jouney.admin.interfaces.journey;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record JourneyUpdateInput(
        @NotBlank @Size(max = 200) String name,
        @NotBlank String description) {
}
