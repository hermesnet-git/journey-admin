package com.jouney.admin.domain.version;

import java.util.UUID;

/**
 * Republishing is limited to the journey's most recent UNPUBLISHED version — not a rollback to
 * any older/ARCHIVED version (REQ-06.05.004).
 */
public class VersionNotLatestUnpublishedException extends RuntimeException {

    public VersionNotLatestUnpublishedException(UUID versionId) {
        super("Only the journey's most recent unpublished version can be republished: " + versionId);
    }
}
