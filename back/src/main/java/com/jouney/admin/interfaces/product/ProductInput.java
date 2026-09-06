package com.jouney.admin.interfaces.product;

import com.jouney.admin.domain.channel.ChannelType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.Set;

public record ProductInput(
        @NotBlank @Size(max = 150) String name,
        @NotBlank String description,
        @NotEmpty Set<ChannelType> channelTypes) {
}
