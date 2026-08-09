package com.jouney.admin.application.publication;

import com.jouney.admin.application.audit.RecordAuditEvent;
import com.jouney.admin.domain.audit.AuditResult;
import com.jouney.admin.domain.journey.Journey;
import com.jouney.admin.domain.journey.JourneyNotFoundException;
import com.jouney.admin.domain.journey.JourneyNotPublishedException;
import com.jouney.admin.domain.journey.JourneyRepository;
import com.jouney.admin.domain.journey.JourneyStatus;
import com.jouney.admin.domain.version.JourneyVersionRepository;
import com.jouney.admin.domain.version.VersionStatus;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class UnpublishJourney {

    private final JourneyRepository journeyRepository;
    private final JourneyVersionRepository journeyVersionRepository;
    private final RuntimePublicationPort runtimePublicationPort;
    private final RecordAuditEvent recordAuditEvent;

    public UnpublishJourney(JourneyRepository journeyRepository, JourneyVersionRepository journeyVersionRepository,
                             RuntimePublicationPort runtimePublicationPort, RecordAuditEvent recordAuditEvent) {
        this.journeyRepository = journeyRepository;
        this.journeyVersionRepository = journeyVersionRepository;
        this.runtimePublicationPort = runtimePublicationPort;
        this.recordAuditEvent = recordAuditEvent;
    }

    public void execute(UUID journeyId) {
        Journey journey = journeyRepository.findById(journeyId)
                .orElseThrow(() -> new JourneyNotFoundException(journeyId));

        if (journey.getStatus() != JourneyStatus.PUBLISHED) {
            throw new JourneyNotPublishedException(journeyId);
        }

        // The publication record (snapshot) is intentionally preserved — only the
        // journey's status changes. See REQ-06.01.004 / REQ-02.01.005.
        runtimePublicationPort.unpublish(journeyId);

        // No version stays PUBLISHED once the journey itself is UNPUBLISHED — mark it UNPUBLISHED
        // too (not ARCHIVED, which means "superseded by a newer publish") so the journey no longer
        // reports a currently-published version (REQ-06.04.007).
        journeyVersionRepository.findByJourneyIdAndStatus(journeyId, VersionStatus.PUBLISHED)
                .ifPresent(version -> {
                    version.unpublish();
                    journeyVersionRepository.save(version);
                });

        journey.unpublish();
        journeyRepository.save(journey);
        recordAuditEvent.record("JOURNEY_UNPUBLISH", "JOURNEY", journeyId, AuditResult.SUCCESS,
                Map.of("status", "UNPUBLISHED"), null);
    }
}
