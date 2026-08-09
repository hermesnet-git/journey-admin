package com.jouney.admin.domain.version;

import java.util.UUID;

public class VersionHasNoFlowException extends RuntimeException {

    public VersionHasNoFlowException(UUID versionId) {
        super("Journey version has no flow and cannot be published: " + versionId);
    }
}
