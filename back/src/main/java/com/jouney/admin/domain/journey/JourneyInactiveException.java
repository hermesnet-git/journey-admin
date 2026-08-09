package com.jouney.admin.domain.journey;

import java.util.UUID;

public class JourneyInactiveException extends RuntimeException {

    public JourneyInactiveException(UUID journeyId) {
        super("Cannot modify an inactive journey: " + journeyId);
    }
}
