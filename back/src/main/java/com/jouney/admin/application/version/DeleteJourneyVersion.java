package com.jouney.admin.application.version;

import com.jouney.admin.application.audit.RecordAuditEvent;
import com.jouney.admin.domain.audit.AuditResult;
import com.jouney.admin.domain.version.JourneyVersion;
import com.jouney.admin.domain.version.JourneyVersionNotFoundException;
import com.jouney.admin.domain.version.JourneyVersionRepository;
import com.jouney.admin.domain.version.VersionNotDraftException;
import com.jouney.admin.domain.version.VersionStatus;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Deletes a DRAFT journey version (REQ-06.02.012): a draft never went through publication, so it's
 * removed physically, not soft-deleted like {@link com.jouney.admin.application.journey.DeleteJourney}
 * does for a journey that has publication history. Any other status is rejected — a version that
 * was ever published carries history worth keeping.
 */
@Service
public class DeleteJourneyVersion {

    private final JourneyVersionRepository journeyVersionRepository;
    private final RecordAuditEvent recordAuditEvent;

    public DeleteJourneyVersion(JourneyVersionRepository journeyVersionRepository, RecordAuditEvent recordAuditEvent) {
        this.journeyVersionRepository = journeyVersionRepository;
        this.recordAuditEvent = recordAuditEvent;
    }

    public void execute(UUID journeyId, UUID versionId) {
        JourneyVersion version = journeyVersionRepository.findById(versionId)
                .filter(v -> v.getJourneyId().equals(journeyId))
                .orElseThrow(() -> new JourneyVersionNotFoundException(versionId));
        if (version.getStatus() != VersionStatus.DRAFT) {
            throw new VersionNotDraftException(versionId);
        }

        journeyVersionRepository.deleteById(versionId);

        recordAuditEvent.record("JOURNEY_VERSION_DELETE", "JOURNEY_VERSION", versionId, AuditResult.SUCCESS,
                Map.of("versionNumber", version.getVersionNumber()), null);
    }
}
