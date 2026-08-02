package com.jouney.admin.application.journey;

import com.jouney.admin.domain.journey.JourneyRepository;
import com.jouney.admin.domain.journey.JourneySort;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class FindJourneys {

    private final JourneyRepository journeyRepository;
    private final JourneyViewAssembler assembler;

    public FindJourneys(JourneyRepository journeyRepository, JourneyViewAssembler assembler) {
        this.journeyRepository = journeyRepository;
        this.assembler = assembler;
    }

    public List<JourneyView> execute(UUID productId, UUID channelId, String query, JourneySort sort) {
        return journeyRepository.search(productId, channelId, query, sort).stream()
                .map(assembler::assemble)
                .toList();
    }
}
