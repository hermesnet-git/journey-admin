package com.jouney.admin.domain.journey;

import java.util.UUID;

public class JourneyNotFoundException extends RuntimeException {

    public JourneyNotFoundException(UUID id) {
        super("Journey not found: " + id);
    }
}
