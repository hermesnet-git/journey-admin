package com.jouney.especregistry.simulation;

import com.jouney.especregistry.adminback.AdminBackClient;
import com.jouney.especregistry.adminback.FlowNode;
import com.jouney.especregistry.adminback.PublicationSnapshot;
import com.jouney.especregistry.camunda.CamundaVariable;
import com.jouney.especregistry.sdui.ActionRegistry;
import com.jouney.especregistry.sdui.ResolutionContext;
import com.jouney.especregistry.sdui.SduiNode;
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

    @PostMapping("/journeys/{journeyId}/nodes/{nodeId}/form/resolve")
    public FormPayload resolveForm(@PathVariable UUID journeyId, @PathVariable String nodeId,
                                    @RequestBody(required = false) ResolveFormRequest request) {
        FlowNode node = findNode(journeyId, nodeId);
        Map<String, CamundaVariable> variables = toVariables(request != null ? request.variables() : null);
        if (!node.hasEmbeddedScreen()) {
            String message = SduiTemplateResolver.resolveMessage(node, variables);
            return new FormPayload(null, node.name(), null, SduiTemplateResolver.messageSdui(message));
        }
        SduiNode root = requireScreenRoot(journeyId, node);
        ActionRegistry.validate(root);
        return new FormPayload(null, node.name(), null,
                SduiTemplateResolver.resolveSduiNode(root, variables, ResolutionContext.fromProcessVariables(variables)));
    }

    @PostMapping("/journeys/{journeyId}/nodes/{nodeId}/answers/convert")
    public Map<String, CamundaVariable> convertAnswers(@PathVariable UUID journeyId, @PathVariable String nodeId,
                                                         @RequestBody(required = false) ConvertAnswersRequest request) {
        FlowNode node = findNode(journeyId, nodeId);
        Map<String, Object> answers = request != null && request.answers() != null ? request.answers() : Map.of();
        SduiNode root = requireScreenRoot(journeyId, node);
        return VariableConversion.fromAnswers(root, answers);
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

    private FlowNode findNode(UUID journeyId, String nodeId) {
        PublicationSnapshot snapshot = adminBackClient.getPublicationSnapshot(journeyId);
        return snapshot.findNode(nodeId)
                .orElseThrow(() -> new IllegalStateException("Nó " + nodeId + " não encontrado no snapshot da jornada"));
    }

    private SduiNode requireScreenRoot(UUID journeyId, FlowNode node) {
        return snapshotRepository.findLatestPublished(journeyId, node.id())
                .orElseThrow(() -> new IllegalStateException("Nó " + node.id()
                        + " tem tela desenhada mas nenhum snapshot publicado foi encontrado no Strapi"))
                .root();
    }

    // Envelopa cada valor bruto do JSON num CamundaVariable sem type (SduiTemplateResolver só usa
    // .value() pra substituir {{token}}, nunca .type()) — permite reaproveitar as mesmas assinaturas
    // que StepResolver já usa (Map<String, CamundaVariable>) sem duplicar a lógica de resolução.
    private Map<String, CamundaVariable> toVariables(Map<String, Object> raw) {
        Map<String, CamundaVariable> result = new LinkedHashMap<>();
        if (raw != null) {
            raw.forEach((key, value) -> result.put(key, new CamundaVariable(value, null)));
        }
        return result;
    }
}
