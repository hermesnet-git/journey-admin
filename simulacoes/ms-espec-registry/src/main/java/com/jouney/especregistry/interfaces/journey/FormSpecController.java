package com.jouney.especregistry.interfaces.journey;

import com.jouney.especregistry.application.journey.ConvertFormAnswers;
import com.jouney.especregistry.application.journey.ConvertJourneyStartVariables;
import com.jouney.especregistry.application.journey.GetJourneyFlow;
import com.jouney.especregistry.application.journey.ResolveScreenForNode;
import com.jouney.especregistry.application.journey.ResolvedScreen;
import com.jouney.especregistry.domain.engine.EngineVariable;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Registro de specs de formulário pro ms-journey (a "fachada real" da plataforma, que fala com o
 * engine diretamente e só recorre a este serviço pra saber o formulário/variáveis de um nó, e o
 * diagrama em si — {@link #flow}) — nenhum destes endpoints conhece processInstanceId nem toca o
 * Camunda: só cruza o snapshot da jornada (lido direto do Postgres do admin/back, sem HTTP) e o
 * Strapi (árvore da tela, quando existe) com o que o chamador já sabe (variáveis correntes, ou
 * respostas do formulário). Fino de propósito — cada operação é um caso de uso em application/journey.
 */
@RestController
@RequestMapping("/api/v1")
public class FormSpecController {

    private final GetJourneyFlow getJourneyFlow;
    private final ResolveScreenForNode resolveScreenForNode;
    private final ConvertFormAnswers convertFormAnswers;
    private final ConvertJourneyStartVariables convertJourneyStartVariables;

    public FormSpecController(GetJourneyFlow getJourneyFlow, ResolveScreenForNode resolveScreenForNode,
                               ConvertFormAnswers convertFormAnswers,
                               ConvertJourneyStartVariables convertJourneyStartVariables) {
        this.getJourneyFlow = getJourneyFlow;
        this.resolveScreenForNode = resolveScreenForNode;
        this.convertFormAnswers = convertFormAnswers;
        this.convertJourneyStartVariables = convertJourneyStartVariables;
    }

    // Ainda usado pelo ms-journey (JourneyController.flow / JourneyStepResolver, pra achar
    // nome/tipo do nó quando a instância está num passo WAITING). O admin/back tem seu próprio
    // equivalente local agora (GetExecutionFlow, via PublicationRepository direto, sem HTTP) — não
    // chama mais este endpoint.
    @GetMapping("/journeys/{journeyId}/flow")
    public FlowBundle flow(@PathVariable UUID journeyId) {
        return FlowBundle.from(getJourneyFlow.execute(journeyId));
    }

    @PostMapping("/journeys/{journeyId}/versions/{journeyVersion}/nodes/{nodeId}/form/resolve")
    public FormPayload resolveForm(@PathVariable UUID journeyId, @PathVariable int journeyVersion,
                                    @PathVariable String nodeId,
                                    @RequestBody(required = false) ResolveFormRequest request) {
        ResolvedScreen resolved = resolveScreenForNode.execute(journeyId, journeyVersion, nodeId,
                request != null ? request.variables() : null);
        return new FormPayload(null, resolved.nodeName(), null, resolved.envelope(), resolved.context());
    }

    @PostMapping("/journeys/{journeyId}/versions/{journeyVersion}/nodes/{nodeId}/answers/convert")
    public Map<String, EngineVariable> convertAnswers(@PathVariable UUID journeyId,
                                                        @PathVariable int journeyVersion,
                                                        @PathVariable String nodeId,
                                                        @RequestBody(required = false) ConvertAnswersRequest request) {
        return convertFormAnswers.execute(journeyId, journeyVersion, nodeId,
                request != null ? request.answers() : null);
    }

    @PostMapping("/journeys/{journeyId}/start-variables/convert")
    public Map<String, EngineVariable> convertStartVariables(@PathVariable UUID journeyId,
                                                               @RequestBody(required = false) ConvertStartVariablesRequest request) {
        return convertJourneyStartVariables.execute(journeyId, request != null ? request.variables() : null);
    }
}
