package com.jouney.admin.application.journey;

import com.jouney.admin.application.HasEverBeenPublishedPort;
import com.jouney.admin.domain.journey.JourneyDeletionBlockedException;
import com.jouney.admin.domain.journey.JourneyNotFoundException;
import com.jouney.admin.domain.journey.JourneyRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class DeleteJourney {

    private final JourneyRepository journeyRepository;
    private final HasEverBeenPublishedPort hasEverBeenPublishedPort;

    public DeleteJourney(JourneyRepository journeyRepository, HasEverBeenPublishedPort hasEverBeenPublishedPort) {
        this.journeyRepository = journeyRepository;
        this.hasEverBeenPublishedPort = hasEverBeenPublishedPort;
    }

    public void execute(UUID id) {
        journeyRepository.findById(id).orElseThrow(() -> new JourneyNotFoundException(id));

        if (hasEverBeenPublishedPort.hasEverBeenPublished(id)) {
            throw new JourneyDeletionBlockedException(id);
        }

        journeyRepository.deleteById(id);
    }
}
