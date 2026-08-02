package com.jouney.admin.application.journey;

import com.jouney.admin.domain.journey.Journey;
import com.jouney.admin.domain.journey.JourneyNotFoundException;
import com.jouney.admin.domain.journey.JourneyRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class UpdateJourney {

    private final JourneyRepository journeyRepository;

    public UpdateJourney(JourneyRepository journeyRepository) {
        this.journeyRepository = journeyRepository;
    }

    public Journey execute(UUID id, String name, String description) {
        Journey journey = journeyRepository.findById(id)
                .orElseThrow(() -> new JourneyNotFoundException(id));
        journey.update(name, description);
        return journeyRepository.save(journey);
    }
}
