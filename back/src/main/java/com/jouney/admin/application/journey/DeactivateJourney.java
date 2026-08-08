package com.jouney.admin.application.journey;

import com.jouney.admin.application.ActivePublicationPort;
import com.jouney.admin.application.audit.RecordAuditEvent;
import com.jouney.admin.domain.ActivePublicationExistsException;
import com.jouney.admin.domain.audit.AuditResult;
import com.jouney.admin.domain.journey.Journey;
import com.jouney.admin.domain.journey.JourneyNotFoundException;
import com.jouney.admin.domain.journey.JourneyRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class DeactivateJourney {

    private final JourneyRepository journeyRepository;
    private final ActivePublicationPort activePublicationPort;
    private final RecordAuditEvent recordAuditEvent;

    public DeactivateJourney(JourneyRepository journeyRepository, ActivePublicationPort activePublicationPort,
                              RecordAuditEvent recordAuditEvent) {
        this.journeyRepository = journeyRepository;
        this.activePublicationPort = activePublicationPort;
        this.recordAuditEvent = recordAuditEvent;
    }

    public void execute(UUID id) {
        Journey journey = journeyRepository.findById(id)
                .orElseThrow(() -> new JourneyNotFoundException(id));

        if (activePublicationPort.existsForJourney(id)) {
            throw new ActivePublicationExistsException(
                    "Cannot deactivate journey with an active publication: " + id);
        }

        journey.deactivate();
        journeyRepository.save(journey);
        recordAuditEvent.record("JOURNEY_DEACTIVATE", "JOURNEY", id, AuditResult.SUCCESS);
    }
}
