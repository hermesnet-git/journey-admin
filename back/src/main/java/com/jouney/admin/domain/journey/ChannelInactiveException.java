package com.jouney.admin.domain.journey;

import java.util.UUID;

public class ChannelInactiveException extends RuntimeException {

    public ChannelInactiveException(UUID channelId) {
        super("Channel is inactive: " + channelId);
    }
}
