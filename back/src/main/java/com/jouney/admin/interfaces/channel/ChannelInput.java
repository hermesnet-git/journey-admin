package com.jouney.admin.interfaces.channel;

import com.jouney.admin.domain.channel.ChannelType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ChannelInput(
        @NotBlank @Size(max = 100) String name,
        @NotBlank String description,
        @NotNull ChannelType type) {
}
