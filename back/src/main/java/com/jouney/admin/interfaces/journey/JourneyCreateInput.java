package com.jouney.admin.interfaces.journey;

import com.jouney.admin.domain.channel.ChannelType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.Set;
import java.util.UUID;

public record JourneyCreateInput(
        @NotNull UUID productId,
        @NotEmpty Set<ChannelType> channelTypes,
        @NotBlank @Size(max = 200) String name,
        @NotBlank String description,
        @Size(max = 100) String templateId) {
}
