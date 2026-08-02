package com.jouney.admin.domain.channel;

import java.util.UUID;

public class ChannelNotFoundException extends RuntimeException {

    public ChannelNotFoundException(UUID id) {
        super("Channel not found: " + id);
    }
}
