package com.jouney.especregistry.simulation;

import com.jouney.especregistry.adminback.AdminBackClient;
import com.jouney.especregistry.adminback.FlowNode;
import com.jouney.especregistry.adminback.PublicationSnapshot;
import com.jouney.especregistry.camunda.CamundaVariable;
import com.jouney.especregistry.sdui.CanonicalSdui;
import com.jouney.especregistry.sdui.SduiScreenEnvelope;
import com.jouney.especregistry.sdui.SnapshotRepository;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Registro de specs de formulário pro ms-journey (a "fachada real" da plataforma, que fala com o
 * engine diretamente e só recorre a este serviço pra saber o formulário/variáveis de um nó) — ao
 * contrário de SimulationController, nenhum destes endpoints conhece processInstanceId nem toca o
 * Camunda: só cruza o snapshot publicado (admin/back, resto do fluxo) e o Strapi (árvore da tela,
 * quando existe) com o que o chamador já sabe (variáveis correntes, ou respostas do formulário).
 */
@RestController
@RequestMapping("/api/v1")
public class FormSpecController {

    private final AdminBackClient adminBackClient;
    private final SnapshotRepository snapshotRepository;

    public FormSpecController(AdminBackClient adminBackClient, SnapshotRepository snapshotRepository) {
        this.adminBackClient = adminBackClient;
        this.snapshotRepository = snapshotRepository;
    }

    @PostMapping("/journeys/{journeyId}/versions/{journeyVersion}/nodes/{nodeId}/form/resolve")
    public FormPayload resolveForm(@PathVariable UUID journeyId, @PathVariable int journeyVersion,
                                    @PathVariable String nodeId,
                                    @RequestBody(required = false) ResolveFormRequest request) {
        FlowNode node = findNode(journeyId, journeyVersion, nodeId);
        if (!node.hasEmbeddedScreen()) {
            throw new IllegalStateException("A Tarefa de Usuário " + node.id() + " não possui tela publicada");
        }
        SduiScreenEnvelope envelope = requireScreen(journeyId, journeyVersion, node);
        CanonicalSdui.validateEnvelope(envelope);
        return new FormPayload(null, node.name(), null, envelope, runtimeContext(envelope, request));
    }

    @PostMapping("/journeys/{journeyId}/versions/{journeyVersion}/nodes/{nodeId}/answers/convert")
    public Map<String, CamundaVariable> convertAnswers(@PathVariable UUID journeyId,
                                                         @PathVariable int journeyVersion,
                                                         @PathVariable String nodeId,
                                                         @RequestBody(required = false) ConvertAnswersRequest request) {
        FlowNode node = findNode(journeyId, journeyVersion, nodeId);
        Map<String, Object> answers = request != null && request.answers() != null ? request.answers() : Map.of();
        return VariableConversion.fromAnswers(requireScreen(journeyId, journeyVersion, node).data(), answers);
    }

    @PostMapping("/journeys/{journeyId}/start-variables/convert")
    public Map<String, CamundaVariable> convertStartVariables(@PathVariable UUID journeyId,
                                                                @RequestBody(required = false) ConvertStartVariablesRequest request) {
        PublicationSnapshot snapshot = adminBackClient.getPublicationSnapshot(journeyId);
        SynchronousChainCheck.verify(snapshot);
        FlowNode start = snapshot.findStartNode()
                .orElseThrow(() -> new IllegalStateException("Jornada " + journeyId + " não tem nó de início"));
        Map<String, Object> variables = request != null ? request.variables() : null;
        return VariableConversion.fromDeclaredVariables(variables, start.startVariables());
    }

    private FlowNode findNode(UUID journeyId, int journeyVersion, String nodeId) {
        PublicationSnapshot snapshot = adminBackClient.getVersionSnapshot(journeyId, journeyVersion);
        return snapshot.findNode(nodeId)
                .orElseThrow(() -> new IllegalStateException("Nó " + nodeId + " não encontrado no snapshot da jornada"));
    }

    private SduiScreenEnvelope requireScreen(UUID journeyId, int journeyVersion, FlowNode node) {
        return snapshotRepository.findPublished(journeyId, journeyVersion, node.id())
                .orElseThrow(() -> new IllegalStateException("Nó " + node.id()
                        + " tem tela desenhada mas nenhum snapshot publicado foi encontrado no Strapi"));
    }

    private Map<String, Object> runtimeContext(SduiScreenEnvelope envelope, ResolveFormRequest request) {
        Map<String, Object> source = request != null && request.variables() != null ? request.variables() : Map.of();
        Map<String, Object> values = new LinkedHashMap<>();
        CanonicalSdui.referencedProcessVariables(envelope.data()).forEach(name -> {
            if (source.containsKey(name)) values.put(name, source.get(name));
        });
        return Map.of("form", values, "data", values, "session", Map.of(), "route", Map.of(),
                "computed", Map.of());
    }

}
