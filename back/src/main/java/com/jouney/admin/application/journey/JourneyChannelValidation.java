package com.jouney.admin.application.journey;

import com.jouney.admin.domain.channel.ChannelType;
import com.jouney.admin.domain.journey.ChannelTypeNotAllowedException;
import com.jouney.admin.domain.journey.JourneyChannelsEmptyException;
import java.util.Set;
import java.util.UUID;

/** Shared by {@link CreateJourney} and {@link UpdateJourneyChannels}: a journey's channel types
 * must be a non-empty subset of its own product's allowed channel types. */
final class JourneyChannelValidation {

    private JourneyChannelValidation() {
    }

    static void validate(UUID productId, Set<ChannelType> productChannelTypes, Set<ChannelType> requested) {
        if (requested == null || requested.isEmpty()) {
            throw new JourneyChannelsEmptyException();
        }
        for (ChannelType type : requested) {
            if (!productChannelTypes.contains(type)) {
                throw new ChannelTypeNotAllowedException(type, productId);
            }
        }
    }
}
