package com.jouney.especregistry.application.journey;

import com.jouney.especregistry.domain.journey.JourneyRepository;
import com.jouney.especregistry.domain.journey.PublicationSnapshot;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class GetJourneyFlow {

    private final JourneyRepository journeyRepository;

    public GetJourneyFlow(JourneyRepository journeyRepository) {
        this.journeyRepository = journeyRepository;
    }

    public PublicationSnapshot execute(UUID journeyId) {
        return journeyRepository.findPublication(journeyId)
                .orElseThrow(() -> new IllegalStateException("Jornada " + journeyId + " não tem publicação"));
    }
}
