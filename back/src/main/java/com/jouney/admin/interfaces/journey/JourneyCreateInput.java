package com.jouney.admin.interfaces.journey;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record JourneyCreateInput(
        @NotNull UUID channelId,
        @NotBlank @Size(max = 200) String name,
        @NotBlank String description) {
}
