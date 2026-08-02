package com.jouney.admin.application.journey;

import com.jouney.admin.domain.journey.Journey;
import com.jouney.admin.domain.journey.JourneyNotFoundException;
import com.jouney.admin.domain.journey.JourneyRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class GetJourney {

    private final JourneyRepository journeyRepository;
    private final JourneyViewAssembler assembler;

    public GetJourney(JourneyRepository journeyRepository, JourneyViewAssembler assembler) {
        this.journeyRepository = journeyRepository;
        this.assembler = assembler;
    }

    public JourneyView execute(UUID id) {
        Journey journey = journeyRepository.findById(id)
                .orElseThrow(() -> new JourneyNotFoundException(id));
        return assembler.assemble(journey);
    }
}
