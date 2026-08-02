package com.jouney.admin.application.flow;

import com.jouney.admin.domain.flow.Flow;
import com.jouney.admin.domain.flow.FlowConnection;
import com.jouney.admin.domain.flow.FlowNode;
import com.jouney.admin.domain.flow.FlowRepository;
import com.jouney.admin.domain.journey.JourneyNotFoundException;
import com.jouney.admin.domain.journey.JourneyRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class UpdateFlow {

    private final FlowRepository flowRepository;
    private final JourneyRepository journeyRepository;

    public UpdateFlow(FlowRepository flowRepository, JourneyRepository journeyRepository) {
        this.flowRepository = flowRepository;
        this.journeyRepository = journeyRepository;
    }

    public Flow execute(UUID journeyId, String name, List<FlowNode> nodes, List<FlowConnection> connections) {
        journeyRepository.findById(journeyId).orElseThrow(() -> new JourneyNotFoundException(journeyId));
        Flow flow = flowRepository.findByJourneyId(journeyId)
                .orElseThrow(() -> new JourneyNotFoundException(journeyId));
        flow.replace(name, nodes, connections);
        return flowRepository.save(flow);
    }
}
