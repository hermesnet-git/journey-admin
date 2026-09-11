package com.jouney.especregistry.application.journey;

import com.jouney.especregistry.domain.engine.EngineVariable;
import com.jouney.especregistry.domain.journey.FlowNode;
import com.jouney.especregistry.domain.journey.JourneyRepository;
import com.jouney.especregistry.domain.journey.PublicationSnapshot;
import com.jouney.especregistry.domain.journey.SynchronousChainCheck;
import com.jouney.especregistry.domain.journey.VariableConversion;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class ConvertJourneyStartVariables {

    private final JourneyRepository journeyRepository;

    public ConvertJourneyStartVariables(JourneyRepository journeyRepository) {
        this.journeyRepository = journeyRepository;
    }

    public Map<String, EngineVariable> execute(UUID journeyId, Map<String, Object> variables) {
        PublicationSnapshot snapshot = journeyRepository.findPublication(journeyId)
                .orElseThrow(() -> new IllegalStateException("Jornada " + journeyId + " não tem publicação"));
        SynchronousChainCheck.verify(snapshot);
        FlowNode start = snapshot.findStartNode()
                .orElseThrow(() -> new IllegalStateException("Jornada " + journeyId + " não tem nó de início"));
        return VariableConversion.fromDeclaredVariables(variables, start.startVariables());
    }
}
