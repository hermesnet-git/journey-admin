package com.jouney.admin.domain.version;

import java.util.UUID;

public class JourneyVersionNotFoundException extends RuntimeException {

    public JourneyVersionNotFoundException(UUID versionId) {
        super("Journey version not found: " + versionId);
    }
}
