package com.jouney.admin.application.publication;

import com.jouney.admin.domain.journey.Journey;
import com.jouney.admin.domain.journey.JourneyNotFoundException;
import com.jouney.admin.domain.journey.JourneyNotPublishedException;
import com.jouney.admin.domain.journey.JourneyRepository;
import com.jouney.admin.domain.journey.JourneyStatus;
import com.jouney.admin.domain.publication.Publication;
import com.jouney.admin.domain.publication.PublicationRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * REQ-02.10.001: lets the Admin UI inspect the exact JSON sent to the runtime's publication
 * API for a journey's currently active publication.
 */
@Service
public class GetPublicationSnapshot {

    private final JourneyRepository journeyRepository;
    private final PublicationRepository publicationRepository;

    public GetPublicationSnapshot(JourneyRepository journeyRepository, PublicationRepository publicationRepository) {
        this.journeyRepository = journeyRepository;
        this.publicationRepository = publicationRepository;
    }

    public Publication execute(UUID journeyId) {
        Journey journey = journeyRepository.findById(journeyId)
                .orElseThrow(() -> new JourneyNotFoundException(journeyId));

        if (journey.getStatus() != JourneyStatus.PUBLISHED) {
            throw new JourneyNotPublishedException(journeyId);
        }

        return publicationRepository.findByJourneyId(journeyId)
                .orElseThrow(() -> new JourneyNotPublishedException(journeyId));
    }
}
