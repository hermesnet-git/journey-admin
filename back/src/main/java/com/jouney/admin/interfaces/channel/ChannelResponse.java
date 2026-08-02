package com.jouney.admin.interfaces.channel;

import com.jouney.admin.application.channel.ChannelView;
import com.jouney.admin.domain.Status;
import com.jouney.admin.domain.channel.ChannelType;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ChannelResponse(UUID channelId, UUID productId, String name, String description,
                               ChannelType type, Status status, long journeyCount, OffsetDateTime createdAt,
                               OffsetDateTime updatedAt) {

    public static ChannelResponse from(ChannelView view) {
        var channel = view.channel();
        return new ChannelResponse(channel.getId(), channel.getProductId(), channel.getName(),
                channel.getDescription(), channel.getType(), channel.getStatus(), view.journeyCount(),
                channel.getCreatedAt(), channel.getUpdatedAt());
    }
}
