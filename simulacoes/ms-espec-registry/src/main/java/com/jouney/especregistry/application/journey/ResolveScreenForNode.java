package com.jouney.especregistry.application.journey;

import com.jouney.especregistry.domain.screen.SourceError;
import java.util.LinkedHashSet;
import java.util.Set;
import com.jouney.especregistry.domain.engine.EngineVariable;
import com.jouney.especregistry.domain.journey.FlowNode;
import com.jouney.especregistry.domain.journey.JourneyRepository;
import com.jouney.especregistry.domain.journey.PublicationSnapshot;
import com.jouney.especregistry.domain.screen.CanonicalFormat;
import com.jouney.especregistry.domain.screen.ScreenEnvelope;
import com.jouney.especregistry.domain.screen.SnapshotRepository;
import com.jouney.especregistry.domain.screen.TemplateResolver;
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
    private final ScreenDataSourceFetcher dataSourceFetcher;

    public ResolveScreenForNode(JourneyRepository journeyRepository, SnapshotRepository snapshotRepository,
                                ScreenDataSourceFetcher dataSourceFetcher) {
        this.journeyRepository = journeyRepository;
        this.snapshotRepository = snapshotRepository;
        this.dataSourceFetcher = dataSourceFetcher;
    }

    public ResolvedScreen execute(UUID journeyId, int journeyVersion, String nodeId, Map<String, Object> rawVariables) {
        return execute(journeyId, journeyVersion, nodeId, rawVariables, null);
    }

    /** {@code processInstanceId} (opcional) só serve pra registrar as consultas às fontes de dados da
     * tela pro Diagnóstico da instância. */
    public ResolvedScreen execute(UUID journeyId, int journeyVersion, String nodeId, Map<String, Object> rawVariables,
                                  String processInstanceId) {
        FlowNode node = findNode(journeyId, journeyVersion, nodeId);
        if (!node.hasEmbeddedScreen()) {
            throw new IllegalStateException("A Tarefa de Usuário " + node.id() + " não possui tela publicada");
        }
        ScreenEnvelope envelope = requireScreen(journeyId, journeyVersion, node);
        CanonicalFormat.validateEnvelope(envelope);
        Map<String, Object> context = runtimeContext(envelope, rawVariables);
        // Fontes de dados de referência (ADR-002): buscadas agora, a cada montagem da tela; o
        // resultado entra só no contexto desta tela como data.<apelido>, nunca vira variável da instância.
        @SuppressWarnings("unchecked")
        Map<String, Object> values = (Map<String, Object>) context.get("form");
        Map<String, EngineVariable> engineVariables = new LinkedHashMap<>();
        values.forEach((name, value) -> engineVariables.put(name, new EngineVariable(value, "Object")));
        ScreenDataSourceFetcher.Fetched fetched = dataSourceFetcher.fetchAll(envelope.dataSources(), engineVariables,
                new ScreenDataSourceFetcher.CallContext(processInstanceId, journeyId, journeyVersion, nodeId));
        fetched.lists().forEach((name, variable) -> values.put(name, variable.value()));
        ScreenEnvelope resolved = resolveEnvelope(envelope, context, fetched.errors());
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
                        + " tem tela desenhada mas nenhuma tela publicada foi encontrada"));
    }

    private Map<String, Object> runtimeContext(ScreenEnvelope envelope, Map<String, Object> rawVariables) {
        Map<String, Object> source = rawVariables != null ? rawVariables : Map.of();
        Map<String, Object> values = new LinkedHashMap<>();
        Set<String> referenced = new LinkedHashSet<>(CanonicalFormat.referencedProcessVariables(envelope.data()));
        referenced.addAll(CanonicalFormat.dataSourceParamVariables(envelope.dataSources()));
        referenced.forEach(name -> {
            if (source.containsKey(name)) values.put(name, source.get(name));
        });
        return Map.of("form", values, "data", values);
    }

    @SuppressWarnings("unchecked")
    private ScreenEnvelope resolveEnvelope(ScreenEnvelope envelope, Map<String, Object> context,
                                           Map<String, SourceError> sourceErrors) {
        Map<String, Object> formValues = (Map<String, Object>) context.get("form");
        Map<String, EngineVariable> variables = new LinkedHashMap<>();
        formValues.forEach((name, value) -> variables.put(name, new EngineVariable(value, "Object")));
        JsonNode resolvedData = TemplateResolver.resolveTuple(envelope.data(), variables, sourceErrors);
        return new ScreenEnvelope(envelope.schemaVersion(), envelope.catalogVersion(), envelope.journeyId(),
                envelope.journeyVersion(), envelope.uiStepId(), envelope.status(), envelope.publishedAt(),
                envelope.supportedTargets(), envelope.minRendererVersion(),
                // A configuração das fontes (URL, credencial) nunca sai do servidor: o canal recebe
                // só o resultado, já dentro dos componentes.
                Map.of(), resolvedData);
    }
}
