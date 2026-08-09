package com.jouney.admin.application.version;

import com.jouney.admin.domain.version.JourneyVersion;
import com.jouney.admin.domain.version.VersionNotUnpublishedException;
import com.jouney.admin.domain.version.VersionStatus;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Republishes any UNPUBLISHED version of a journey (REQ-06.04.011), returning it to PUBLISHED
 * with its snapshot untouched. INACTIVE versions (soft-deleted journeys) stay out of reach
 * (REQ-06.05.004). If the journey already has a different PUBLISHED version (possible when a new
 * DRAFT was published after this one was unpublished), {@link PublishJourneyVersion#goLive} marks
 * it UNPUBLISHED, same as any other publish.
 */
@Service
public class RepublishJourneyVersion {

    private final PublishJourneyVersion publishJourneyVersion;

    public RepublishJourneyVersion(PublishJourneyVersion publishJourneyVersion) {
        this.publishJourneyVersion = publishJourneyVersion;
    }

    public JourneyVersion execute(UUID journeyId, UUID versionId) {
        JourneyVersion version = publishJourneyVersion.findVersion(journeyId, versionId);
        if (version.getStatus() != VersionStatus.UNPUBLISHED) {
            throw new VersionNotUnpublishedException(versionId);
        }

        return publishJourneyVersion.goLive(journeyId, version, "UNPUBLISHED", "JOURNEY_VERSION_REPUBLISH");
    }
}
