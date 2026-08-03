package com.jouney.admin.application.publication;

import com.jouney.admin.domain.journey.Journey;
import com.jouney.admin.domain.journey.JourneyNotFoundException;
import com.jouney.admin.domain.journey.JourneyNotPublishedException;
import com.jouney.admin.domain.journey.JourneyRepository;
import com.jouney.admin.domain.journey.JourneyStatus;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class UnpublishJourney {

    private final JourneyRepository journeyRepository;
    private final RuntimePublicationPort runtimePublicationPort;

    public UnpublishJourney(JourneyRepository journeyRepository, RuntimePublicationPort runtimePublicationPort) {
        this.journeyRepository = journeyRepository;
        this.runtimePublicationPort = runtimePublicationPort;
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

        journey.unpublish();
        journeyRepository.save(journey);
    }
}
