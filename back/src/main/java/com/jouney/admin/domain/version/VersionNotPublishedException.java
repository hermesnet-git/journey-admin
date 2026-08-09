package com.jouney.admin.domain.version;

import java.util.UUID;

public class VersionNotPublishedException extends RuntimeException {

    public VersionNotPublishedException(UUID versionId) {
        super("Journey version is not published and cannot be unpublished: " + versionId);
    }
}
