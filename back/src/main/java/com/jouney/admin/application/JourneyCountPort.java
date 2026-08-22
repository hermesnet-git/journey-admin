package com.jouney.admin.application;

import java.util.UUID;

/**
 * Counts journeys under a channel, for REQ-01.03.007.
 */
public interface JourneyCountPort {

    long countByChannelId(UUID channelId);
}
