package com.jouney.admin.domain.version;

import java.util.UUID;

public class VersionNotDraftException extends RuntimeException {

    public VersionNotDraftException(UUID versionId) {
        super("Journey version is not a draft and cannot be published: " + versionId);
    }
}
