package com.jouney.admin.domain.journey;

import java.util.UUID;

public class JourneyNotPublishedException extends RuntimeException {

    public JourneyNotPublishedException(UUID journeyId) {
        super("Journey is not currently published: " + journeyId);
    }
}
