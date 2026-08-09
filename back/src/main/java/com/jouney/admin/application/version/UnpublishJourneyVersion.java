package com.jouney.admin.application.version;

import com.jouney.admin.application.publication.UnpublishJourney;
import com.jouney.admin.domain.version.JourneyVersion;
import com.jouney.admin.domain.version.JourneyVersionNotFoundException;
import com.jouney.admin.domain.version.JourneyVersionRepository;
import com.jouney.admin.domain.version.VersionNotPublishedException;
import com.jouney.admin.domain.version.VersionStatus;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Version-scoped "Despublicar" entry point (REQ-06.04.009): validates that {@code versionId} is
 * the journey's currently PUBLISHED version, then reuses {@link UnpublishJourney} so both paths
 * share the same behavior — runtime unpublish, flipping the version to UNPUBLISHED, and flipping
 * the journey to UNPUBLISHED — instead of duplicating it.
 */
@Service
public class UnpublishJourneyVersion {

    private final JourneyVersionRepository journeyVersionRepository;
    private final UnpublishJourney unpublishJourney;

    public UnpublishJourneyVersion(JourneyVersionRepository journeyVersionRepository, UnpublishJourney unpublishJourney) {
        this.journeyVersionRepository = journeyVersionRepository;
        this.unpublishJourney = unpublishJourney;
    }

    public JourneyVersion execute(UUID journeyId, UUID versionId) {
        JourneyVersion version = journeyVersionRepository.findById(versionId)
                .filter(v -> v.getJourneyId().equals(journeyId))
                .orElseThrow(() -> new JourneyVersionNotFoundException(versionId));
        if (version.getStatus() != VersionStatus.PUBLISHED) {
            throw new VersionNotPublishedException(versionId);
        }

        unpublishJourney.execute(journeyId);

        return journeyVersionRepository.findById(versionId).orElseThrow(() -> new JourneyVersionNotFoundException(versionId));
    }
}
