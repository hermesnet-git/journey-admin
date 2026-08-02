package com.jouney.admin.application;

import java.util.UUID;

/**
 * Counts journeys under a channel, for REQ-01.03.007. Journeys are introduced in
 * EP-02; until then, every channel has zero journeys.
 */
public interface JourneyCountPort {

    long countByChannelId(UUID channelId);
}
