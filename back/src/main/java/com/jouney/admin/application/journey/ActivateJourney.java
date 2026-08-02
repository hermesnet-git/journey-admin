package com.jouney.admin.application.journey;

import com.jouney.admin.domain.journey.Journey;
import com.jouney.admin.domain.journey.JourneyNotFoundException;
import com.jouney.admin.domain.journey.JourneyRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class ActivateJourney {

    private final JourneyRepository journeyRepository;

    public ActivateJourney(JourneyRepository journeyRepository) {
        this.journeyRepository = journeyRepository;
    }

    public void execute(UUID id) {
        Journey journey = journeyRepository.findById(id)
                .orElseThrow(() -> new JourneyNotFoundException(id));
        journey.activate();
        journeyRepository.save(journey);
    }
}
