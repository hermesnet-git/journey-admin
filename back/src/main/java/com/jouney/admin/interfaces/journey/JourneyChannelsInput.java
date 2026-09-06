package com.jouney.admin.interfaces.journey;

import com.jouney.admin.domain.channel.ChannelType;
import jakarta.validation.constraints.NotEmpty;
import java.util.Set;

public record JourneyChannelsInput(@NotEmpty Set<ChannelType> channelTypes) {
}
