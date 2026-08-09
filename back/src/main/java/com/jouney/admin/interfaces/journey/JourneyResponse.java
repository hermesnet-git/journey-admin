package com.jouney.admin.interfaces.journey;

import com.jouney.admin.application.journey.JourneyView;
import com.jouney.admin.domain.journey.JourneyStatus;
import java.time.OffsetDateTime;
import java.util.UUID;

public record JourneyResponse(UUID journeyId, UUID channelId, String channelName, UUID productId,
                               String productName, String name, String description, JourneyStatus status,
                               OffsetDateTime publishedAt, UUID publishedVersionId, Integer publishedVersionNumber,
                               OffsetDateTime createdAt, OffsetDateTime updatedAt) {

    public static JourneyResponse from(JourneyView view) {
        var journey = view.journey();
        return new JourneyResponse(journey.getId(), journey.getChannelId(), view.channelName(), view.productId(),
                view.productName(), journey.getName(), journey.getDescription(), journey.getStatus(),
                view.publishedAt(), view.publishedVersionId(), view.publishedVersionNumber(), journey.getCreatedAt(),
                journey.getUpdatedAt());
    }
}
