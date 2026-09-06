package com.jouney.admin.interfaces.journey;

import com.jouney.admin.application.journey.JourneyView;
import com.jouney.admin.domain.channel.ChannelType;
import com.jouney.admin.domain.journey.JourneyStatus;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record JourneyResponse(UUID journeyId, UUID productId, String productName, List<ChannelType> channelTypes,
                               String name, String description, JourneyStatus status, OffsetDateTime publishedAt,
                               UUID publishedVersionId, Integer publishedVersionNumber, OffsetDateTime createdAt,
                               OffsetDateTime updatedAt) {

    public static JourneyResponse from(JourneyView view) {
        var journey = view.journey();
        return new JourneyResponse(journey.getId(), view.productId(), view.productName(), view.channelTypes(),
                journey.getName(), journey.getDescription(), journey.getStatus(), view.publishedAt(),
                view.publishedVersionId(), view.publishedVersionNumber(), journey.getCreatedAt(),
                journey.getUpdatedAt());
    }
}
