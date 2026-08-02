package com.jouney.admin.application;

import java.util.UUID;

/**
 * Checks for active (PUBLISHED) journey publications, used to guard product/channel/journey
 * deactivation (REQ-01.04.004/005, REQ-02.01.006). Publications are introduced in EP-06;
 * until then, no publication can exist.
 */
public interface ActivePublicationPort {

    boolean existsForProduct(UUID productId);

    boolean existsForChannel(UUID channelId);

    boolean existsForJourney(UUID journeyId);
}
