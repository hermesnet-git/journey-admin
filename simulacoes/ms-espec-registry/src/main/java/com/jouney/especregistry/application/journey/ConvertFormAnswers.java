package com.jouney.especregistry.application.journey;

import com.jouney.especregistry.domain.engine.EngineVariable;
import com.jouney.especregistry.domain.journey.FlowNode;
import com.jouney.especregistry.domain.journey.JourneyRepository;
import com.jouney.especregistry.domain.journey.PublicationSnapshot;
import com.jouney.especregistry.domain.journey.VariableConversion;
import com.jouney.especregistry.domain.sdui.ScreenEnvelope;
import com.jouney.especregistry.domain.sdui.SnapshotRepository;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class ConvertFormAnswers {

    private final JourneyRepository journeyRepository;
    private final SnapshotRepository snapshotRepository;

    public ConvertFormAnswers(JourneyRepository journeyRepository, SnapshotRepository snapshotRepository) {
        this.journeyRepository = journeyRepository;
        this.snapshotRepository = snapshotRepository;
    }

    public Map<String, EngineVariable> execute(UUID journeyId, int journeyVersion, String nodeId,
                                                Map<String, Object> answers) {
        FlowNode node = findNode(journeyId, journeyVersion, nodeId);
        ScreenEnvelope screen = requireScreen(journeyId, journeyVersion, node);
        return VariableConversion.fromAnswers(screen.data(), answers != null ? answers : Map.of());
    }

    private FlowNode findNode(UUID journeyId, int journeyVersion, String nodeId) {
        PublicationSnapshot snapshot = journeyRepository.findVersion(journeyId, journeyVersion)
                .orElseThrow(() -> new IllegalStateException(
                        "Versão " + journeyVersion + " não encontrada para a jornada " + journeyId));
        return snapshot.findNode(nodeId)
                .orElseThrow(() -> new IllegalStateException("Nó " + nodeId + " não encontrado no snapshot da jornada"));
    }

    private ScreenEnvelope requireScreen(UUID journeyId, int journeyVersion, FlowNode node) {
        return snapshotRepository.findPublished(journeyId, journeyVersion, node.id())
                .orElseThrow(() -> new IllegalStateException("Nó " + node.id()
                        + " tem tela desenhada mas nenhum snapshot publicado foi encontrado no Strapi"));
    }
}
