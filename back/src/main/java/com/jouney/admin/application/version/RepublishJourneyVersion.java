package com.jouney.admin.application.version;

import com.jouney.admin.domain.version.JourneyVersion;
import com.jouney.admin.domain.version.JourneyVersionRepository;
import com.jouney.admin.domain.version.VersionNotLatestUnpublishedException;
import com.jouney.admin.domain.version.VersionNotUnpublishedException;
import com.jouney.admin.domain.version.VersionStatus;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Republishes the journey's most recent UNPUBLISHED version (REQ-06.04.011), returning it to
 * PUBLISHED with its snapshot untouched. Not a rollback: only the most recent UNPUBLISHED version
 * is eligible — older/ARCHIVED versions stay out of reach (REQ-06.05.004). If the journey already
 * has a different PUBLISHED version (possible when a new DRAFT was published after this one was
 * unpublished), {@link PublishJourneyVersion#goLive} archives it, same as any other publish.
 */
@Service
public class RepublishJourneyVersion {

    private final JourneyVersionRepository journeyVersionRepository;
    private final PublishJourneyVersion publishJourneyVersion;

    public RepublishJourneyVersion(JourneyVersionRepository journeyVersionRepository,
                                    PublishJourneyVersion publishJourneyVersion) {
        this.journeyVersionRepository = journeyVersionRepository;
        this.publishJourneyVersion = publishJourneyVersion;
    }

    public JourneyVersion execute(UUID journeyId, UUID versionId) {
        JourneyVersion version = publishJourneyVersion.findVersion(journeyId, versionId);
        if (version.getStatus() != VersionStatus.UNPUBLISHED) {
            throw new VersionNotUnpublishedException(versionId);
        }

        boolean isLatestUnpublished = journeyVersionRepository.findByJourneyId(journeyId).stream()
                .filter(v -> v.getStatus() == VersionStatus.UNPUBLISHED)
                .findFirst()
                .map(v -> v.getId().equals(versionId))
                .orElse(false);
        if (!isLatestUnpublished) {
            throw new VersionNotLatestUnpublishedException(versionId);
        }

        return publishJourneyVersion.goLive(journeyId, version, "UNPUBLISHED", "JOURNEY_VERSION_REPUBLISH");
    }
}
