package com.jouney.admin.interfaces.flow;

import com.jouney.admin.application.flow.GenerateFlow;
import com.jouney.admin.application.flow.GetFlow;
import com.jouney.admin.application.flow.PromoteEmbeddedScreen;
import com.jouney.admin.application.flow.TestConnector;
import com.jouney.admin.application.flow.UpdateFlow;
import com.jouney.admin.domain.flow.Flow;
import com.jouney.admin.domain.flow.FlowIds;
import com.jouney.admin.domain.flow.FlowValidationException;
import com.jouney.admin.infrastructure.ai.AiRequestDeclinedException;
import com.jouney.admin.interfaces.ApiError;
import com.jouney.admin.interfaces.form.FormResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/v1/journeys/{journeyId}/flow")
public class FlowController {

    private static final Logger log = LoggerFactory.getLogger(FlowController.class);

    private final GetFlow getFlow;
    private final UpdateFlow updateFlow;
    private final TestConnector testConnector;
    private final GenerateFlow generateFlow;
    private final PromoteEmbeddedScreen promoteEmbeddedScreen;

    public FlowController(GetFlow getFlow, UpdateFlow updateFlow, TestConnector testConnector,
                           GenerateFlow generateFlow, PromoteEmbeddedScreen promoteEmbeddedScreen) {
        this.getFlow = getFlow;
        this.updateFlow = updateFlow;
        this.testConnector = testConnector;
        this.generateFlow = generateFlow;
        this.promoteEmbeddedScreen = promoteEmbeddedScreen;
    }

    @PreAuthorize("hasAnyRole('VIEWER','EDITOR','ADMIN')")
    @GetMapping
    public FlowResponse get(@PathVariable UUID journeyId) {
        return FlowResponse.from(getFlow.execute(journeyId));
    }

    @PreAuthorize("hasAnyRole('EDITOR','ADMIN')")
    @PutMapping
    public FlowResponse update(@PathVariable UUID journeyId, @Valid @RequestBody FlowInput input) {
        var nodes = input.nodes().stream().map(FlowNodeInput::toDomain).toList();
        var connections = input.connections().stream().map(FlowConnectionInput::toDomain).toList();
        var annotations = input.annotations().stream().map(FlowAnnotationInput::toDomain).toList();
        return FlowResponse.from(updateFlow.execute(journeyId, input.name(), nodes, connections, annotations));
    }

    // Só preview (protótipo, FT-03): nunca toca em FlowRepository/UpdateFlow — monta um Flow
    // transitório só pra reaproveitar o formato de FlowResponse, igual ao que o GET devolve. O canvas
    // carrega isso como uma edição manual não salva; o usuário continua revisando e clicando em
    // Salvar pra persistir de verdade. Roda em SSE porque o loop de correção do AiFlowGenerator pode
    // levar até 3 tentativas — o front acompanha cada uma via eventos "progress" antes do "result"
    // final (ou "error" se todas falharem). @PreAuthorize já validou a permissão nesta thread antes
    // do trabalho de verdade começar numa virtual thread separada.
    @PreAuthorize("hasAnyRole('EDITOR','ADMIN')")
    @PostMapping(value = "/generate", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter generate(@PathVariable UUID journeyId, @Valid @RequestBody GenerateFlowInput input) {
        // Até 5 tentativas (repair loop), cada uma podendo levar bem mais que alguns segundos num
        // pedido complexo com um modelo "lite" — 120s já se mostrou curto demais na prática (o timeout
        // fechava a conexão antes do resultado sair, front ficava esperando pra sempre porque o evento
        // final nunca chegava a tempo). Com o read timeout de 90s por tentativa (FlowGenerationPrompt),
        // o pior caso (5 tentativas travando perto do limite) chegaria a 450s — 600s dá folga real.
        SseEmitter emitter = new SseEmitter(600_000L);
        Thread.ofVirtual().start(() -> {
            try {
                var generated = generateFlow.execute(journeyId, input.prompt(),
                        message -> sendEvent(emitter, "progress", message));
                OffsetDateTime now = OffsetDateTime.now();
                var flow = new Flow(FlowIds.newFlowId(), journeyId, generated.name(), generated.nodes(),
                        generated.connections(), List.of(), now, now);
                sendEvent(emitter, "result", FlowResponse.from(flow));
                emitter.complete();
            } catch (Exception ex) {
                sendEvent(emitter, "error", errorPayload(ex));
                emitter.complete();
            }
        });
        return emitter;
    }

    private void sendEvent(SseEmitter emitter, String name, Object data) {
        try {
            emitter.send(SseEmitter.event().name(name).data(data));
        } catch (Exception ex) {
            log.warn("Falha ao enviar evento SSE '{}': {}", name, ex.toString(), ex);
        }
    }

    private ApiError errorPayload(Exception ex) {
        if (ex instanceof FlowValidationException fve) {
            var details = fve.getViolations().stream()
                    .map(v -> new ApiError.ApiErrorDetail("flow", "STRUCTURAL_VIOLATION", v)).toList();
            return new ApiError(OffsetDateTime.now(), 422, "UNPROCESSABLE_ENTITY", fve.getMessage(), "", details);
        }
        if (ex instanceof AiRequestDeclinedException) {
            return new ApiError(OffsetDateTime.now(), 422, "REQUEST_OUT_OF_SCOPE",
                    "A IA não gerou um fluxo: " + ex.getMessage(), "", null);
        }
        return new ApiError(OffsetDateTime.now(), 502, "AI_GENERATION_UNAVAILABLE", ex.getMessage(), "", null);
    }

    // journeyId/nodeId scope the resource in the URL (REQ-03.10.001) but aren't needed by the
    // call itself — the test runs against the values currently in the editor, not the saved flow.
    @PreAuthorize("hasAnyRole('EDITOR','ADMIN')")
    @PostMapping("/nodes/{nodeId}/connector-test")
    public ConnectorTestResponse testConnector(@PathVariable UUID journeyId, @PathVariable String nodeId,
                                                 @Valid @RequestBody ConnectorTestInput input) {
        return ConnectorTestResponse.from(testConnector.execute(input.toCommand()));
    }

    // "Salvar como formulário reutilizável" — não altera o nó (não mexe em embeddedScreen), só cria
    // uma cópia no catálogo de Formulários a partir da tela desenhada.
    @PreAuthorize("hasAnyRole('EDITOR','ADMIN')")
    @PostMapping("/nodes/{nodeId}/promote-form")
    public FormResponse promoteForm(@PathVariable UUID journeyId, @PathVariable String nodeId,
                                     @Valid @RequestBody PromoteFormInput input) {
        return FormResponse.from(promoteEmbeddedScreen.execute(journeyId, nodeId, input.name(), input.description()));
    }

    public record PromoteFormInput(@NotBlank String name, String description) {
    }
}
