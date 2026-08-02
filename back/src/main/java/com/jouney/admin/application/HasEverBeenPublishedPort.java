package com.jouney.admin.application;

import java.util.UUID;

/**
 * Checks whether a journey has ever had a publication record, used to guard permanent
 * deletion (REQ-02.01.004/005). Publications are introduced in EP-06; until then, no
 * journey has ever been published.
 */
public interface HasEverBeenPublishedPort {

    boolean hasEverBeenPublished(UUID journeyId);
}
