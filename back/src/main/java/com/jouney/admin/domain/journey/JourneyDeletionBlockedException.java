package com.jouney.admin.domain.journey;

import java.util.UUID;

public class JourneyDeletionBlockedException extends RuntimeException {

    public JourneyDeletionBlockedException(UUID journeyId) {
        super("Cannot permanently delete a journey that has been published: " + journeyId);
    }
}
