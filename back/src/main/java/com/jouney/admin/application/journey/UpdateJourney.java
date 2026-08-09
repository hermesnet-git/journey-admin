package com.jouney.admin.application.journey;

import com.jouney.admin.application.audit.RecordAuditEvent;
import com.jouney.admin.domain.audit.AuditResult;
import com.jouney.admin.domain.journey.Journey;
import com.jouney.admin.domain.journey.JourneyInactiveException;
import com.jouney.admin.domain.journey.JourneyNotFoundException;
import com.jouney.admin.domain.journey.JourneyRepository;
import com.jouney.admin.domain.journey.JourneyStatus;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class UpdateJourney {

    private final JourneyRepository journeyRepository;
    private final RecordAuditEvent recordAuditEvent;

    public UpdateJourney(JourneyRepository journeyRepository, RecordAuditEvent recordAuditEvent) {
        this.journeyRepository = journeyRepository;
        this.recordAuditEvent = recordAuditEvent;
    }

    public Journey execute(UUID id, String name, String description) {
        Journey journey = journeyRepository.findById(id)
                .orElseThrow(() -> new JourneyNotFoundException(id));
        if (journey.getStatus() == JourneyStatus.INACTIVE) {
            throw new JourneyInactiveException(id);
        }
        journey.update(name, description);
        Journey saved = journeyRepository.save(journey);
        recordAuditEvent.record("JOURNEY_UPDATE", "JOURNEY", id, AuditResult.SUCCESS);
        return saved;
    }
}
