package com.jouney.admin.domain.journey;

import com.jouney.admin.domain.channel.ChannelType;
import java.util.UUID;

/** A journey can only use channel types its own product declares — thrown when a type outside the
 * product's allowed set is offered as one of the journey's channels. */
public class ChannelTypeNotAllowedException extends RuntimeException {

    public ChannelTypeNotAllowedException(ChannelType channelType, UUID productId) {
        super("Channel type " + channelType + " is not allowed by product " + productId);
    }
}
