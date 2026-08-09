package com.jouney.admin.domain.version;

import java.util.UUID;

public class VersionNotUnpublishedException extends RuntimeException {

    public VersionNotUnpublishedException(UUID versionId) {
        super("Journey version is not unpublished and cannot be republished: " + versionId);
    }
}
