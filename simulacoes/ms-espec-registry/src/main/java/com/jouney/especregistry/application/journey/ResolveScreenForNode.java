package com.jouney.especregistry.application.journey;

import com.jouney.especregistry.domain.engine.EngineVariable;
import com.jouney.especregistry.domain.journey.FlowNode;
import com.jouney.especregistry.domain.journey.JourneyRepository;
import com.jouney.especregistry.domain.journey.PublicationSnapshot;
import com.jouney.especregistry.domain.sdui.CanonicalFormat;
import com.jouney.especregistry.domain.sdui.ResolutionContext;
import com.jouney.especregistry.domain.sdui.ScreenEnvelope;
import com.jouney.especregistry.domain.sdui.SnapshotRepository;
import com.jouney.especregistry.domain.sdui.TemplateResolver;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;

/** Resolve a tela (SDUI) do nó atual pro chamador (ms-journey, admin) — interpolação e binding
 * oneWay (seção 8 do catálogo), guardadas aqui pra nenhum consumidor precisar repetir essa lógica. */
@Service
public class ResolveScreenForNode {

    private final JourneyRepository journeyRepository;
    private final SnapshotRepository snapshotRepository;

    public ResolveScreenForNode(JourneyRepository journeyRepository, SnapshotRepository snapshotRepository) {
        this.journeyRepository = journeyRepository;
        this.snapshotRepository = snapshotRepository;
    }

    public ResolvedScreen execute(UUID journeyId, int journeyVersion, String nodeId, Map<String, Object> rawVariables) {
        FlowNode node = findNode(journeyId, journeyVersion, nodeId);
        if (!node.hasEmbeddedScreen()) {
            throw new IllegalStateException("A Tarefa de Usuário " + node.id() + " não possui tela publicada");
        }
        ScreenEnvelope envelope = requireScreen(journeyId, journeyVersion, node);
        CanonicalFormat.validateEnvelope(envelope);
        Map<String, Object> context = runtimeContext(envelope, rawVariables);
        ScreenEnvelope resolved = resolveEnvelope(envelope, context);
        return new ResolvedScreen(node.name(), resolved, context);
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

    private Map<String, Object> runtimeContext(ScreenEnvelope envelope, Map<String, Object> rawVariables) {
        Map<String, Object> source = rawVariables != null ? rawVariables : Map.of();
        Map<String, Object> values = new LinkedHashMap<>();
        CanonicalFormat.referencedProcessVariables(envelope.data()).forEach(name -> {
            if (source.containsKey(name)) values.put(name, source.get(name));
        });
        return Map.of("form", values, "data", values, "session", Map.of(), "route", Map.of(),
                "computed", Map.of());
    }

    @SuppressWarnings("unchecked")
    private ScreenEnvelope resolveEnvelope(ScreenEnvelope envelope, Map<String, Object> context) {
        Map<String, Object> formValues = (Map<String, Object>) context.get("form");
        Map<String, EngineVariable> variables = new LinkedHashMap<>();
        formValues.forEach((name, value) -> variables.put(name, new EngineVariable(value, "Object")));
        ResolutionContext ctx = ResolutionContext.fromProcessVariables(variables);
        JsonNode resolvedData = TemplateResolver.resolveTuple(envelope.data(), variables, ctx);
        return new ScreenEnvelope(envelope.schemaVersion(), envelope.catalogVersion(), envelope.journeyId(),
                envelope.journeyVersion(), envelope.uiStepId(), envelope.status(), envelope.publishedAt(),
                envelope.supportedTargets(), envelope.minRendererVersion(), envelope.dataSources(), resolvedData);
    }
}
