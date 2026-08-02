package com.jouney.admin.application.flow;

import com.jouney.admin.domain.flow.Flow;
import com.jouney.admin.domain.flow.FlowRepository;
import com.jouney.admin.domain.journey.JourneyNotFoundException;
import com.jouney.admin.domain.journey.JourneyRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class GetFlow {

    private final FlowRepository flowRepository;
    private final JourneyRepository journeyRepository;

    public GetFlow(FlowRepository flowRepository, JourneyRepository journeyRepository) {
        this.flowRepository = flowRepository;
        this.journeyRepository = journeyRepository;
    }

    public Flow execute(UUID journeyId) {
        journeyRepository.findById(journeyId).orElseThrow(() -> new JourneyNotFoundException(journeyId));
        return flowRepository.findByJourneyId(journeyId).orElseThrow(() -> new JourneyNotFoundException(journeyId));
    }
}
