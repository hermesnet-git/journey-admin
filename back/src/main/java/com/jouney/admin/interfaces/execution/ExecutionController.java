package com.jouney.admin.interfaces.execution;

import com.jouney.admin.application.dashboard.RuntimeInstanceControlPort;
import com.jouney.admin.application.execution.CompleteExecutionTask;
import com.jouney.admin.application.execution.ExecutionStepResolver;
import com.jouney.admin.application.execution.ExecutionVariables;
import com.jouney.admin.application.execution.GetExecutionFlow;
import com.jouney.admin.application.execution.GetLatestInstance;
import com.jouney.admin.application.execution.PreviewKafkaMessage;
import com.jouney.admin.application.execution.ResumeExecution;
import com.jouney.admin.application.execution.SendKafkaMessage;
import com.jouney.admin.application.execution.SendTestMessage;
import com.jouney.admin.application.execution.SkipStep;
import com.jouney.admin.application.execution.StartExecution;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Roda uma jornada publicada passo a passo pra teste dentro do próprio Admin Portal (FT-05
 * Execução — iniciar inclusive por MESSAGE_START_EVENT, consultar passo atual com trilha síncrona,
 * completar tarefa com resposta coercionada pro tipo certo e atribuição heurística de erro a um
 * nó, ver/editar variável manualmente, enviar mensagem Kafka manual quando a instância foi
 * iniciada em controle manual). Fala direto com o motor de runtime ({@link
 * com.jouney.admin.application.execution.RuntimeExecutionPort}, produtor Kafka incluso) e com o
 * ms-espec-registry só pra resolver a tela de cada User Task ({@link
 * com.jouney.admin.application.execution.FormResolutionPort}) — nenhuma lógica de catálogo/binding
 * SDUI vive aqui. Busca/detalhe histórico de qualquer instância (ativa ou já terminada) é FT-15
 * Diagnóstico, funcionalidade separada por design (REQ-15.04.001) — ver
 * {@link com.jouney.admin.interfaces.diagnostico.DiagnosticoController}. {@code DELETE
 * /instances/{id}} (parar execução) reaproveita o mesmo {@link
 * com.jouney.admin.application.dashboard.RuntimeInstanceControlPort} do Dashboard, mas é um
 * endpoint próprio aqui — o de lá é {@code /api/v1/dashboard/instances/{id}}, path diferente,
 * ação de monitoramento geral (matar instância abandonada), não desta tela.
 */
@RestController
@RequestMapping("/api/v1")
public class ExecutionController {

    private final GetExecutionFlow getExecutionFlow;
    private final StartExecution startExecution;
    private final ExecutionStepResolver stepResolver;
    private final CompleteExecutionTask completeExecutionTask;
    private final ExecutionVariables executionVariables;
    private final SendKafkaMessage sendKafkaMessage;
    private final PreviewKafkaMessage previewKafkaMessage;
    private final RuntimeInstanceControlPort runtimeInstanceControlPort;
    private final SkipStep skipStep;
    private final SendTestMessage sendTestMessage;
    private final GetLatestInstance getLatestInstance;
    private final ResumeExecution resumeExecution;

    public ExecutionController(GetExecutionFlow getExecutionFlow, StartExecution startExecution,
                                ExecutionStepResolver stepResolver, CompleteExecutionTask completeExecutionTask,
                                ExecutionVariables executionVariables, SendKafkaMessage sendKafkaMessage,
                                PreviewKafkaMessage previewKafkaMessage, RuntimeInstanceControlPort runtimeInstanceControlPort,
                                SkipStep skipStep, SendTestMessage sendTestMessage, GetLatestInstance getLatestInstance,
                                ResumeExecution resumeExecution) {
        this.getExecutionFlow = getExecutionFlow;
        this.startExecution = startExecution;
        this.stepResolver = stepResolver;
        this.completeExecutionTask = completeExecutionTask;
        this.executionVariables = executionVariables;
        this.sendKafkaMessage = sendKafkaMessage;
        this.previewKafkaMessage = previewKafkaMessage;
        this.runtimeInstanceControlPort = runtimeInstanceControlPort;
        this.skipStep = skipStep;
        this.sendTestMessage = sendTestMessage;
        this.getLatestInstance = getLatestInstance;
        this.resumeExecution = resumeExecution;
    }

    // execution-flow, não /flow: esse já é o path do FlowController (editor de fluxo, Flow editável)
    // — este devolve a publicação ativa (Publication) por padrão, ou uma versão publicada
    // específica quando `version` é informado (REQ-05.07.007), nunca o rascunho em edição.
    @PreAuthorize("hasAnyRole('VIEWER','EDITOR','ADMIN')")
    @GetMapping("/journeys/{journeyId}/execution-flow")
    public FlowBundleResponse flow(@PathVariable UUID journeyId, @RequestParam(required = false) Integer version) {
        GetExecutionFlow.ResolvedFlow resolved = getExecutionFlow.execute(journeyId, version);
        return FlowBundleResponse.of(resolved.channelTypes(), resolved.flowNodes(), resolved.flowConnections());
    }

    // `version` (número de negócio, não o UUID) opcional — REQ-05.07.007: só faz sentido informar
    // quando a jornada tem mais de uma versão publicada simultaneamente; ausente, usa a publicação
    // ativa (comportamento de sempre).
    @PreAuthorize("hasAnyRole('VIEWER','EDITOR','ADMIN')")
    @PostMapping("/journeys/{journeyId}/instances")
    public InstanceResponse start(@PathVariable UUID journeyId, @RequestParam String channel,
                                   @RequestParam(defaultValue = "false") boolean manualKafkaControl,
                                   @RequestParam(required = false) Integer version,
                                   @RequestBody(required = false) Map<String, Object> variables) {
        return InstanceResponse.from(startExecution.execute(journeyId, channel, variables, manualKafkaControl, version));
    }

    // `since` (ISO 8601) opcional: quando presente, inclui a trilha do que o motor atravessou
    // sozinho desde então (ex.: o worker automático de Kafka publicando em segundo plano enquanto
    // o usuário olha um passo WAITING).
    @PreAuthorize("hasAnyRole('VIEWER','EDITOR','ADMIN')")
    @GetMapping("/instances/{processInstanceId}/current-step")
    public StepResponse currentStep(@PathVariable String processInstanceId,
                                     @RequestParam(required = false) String since) {
        Instant sinceInstant = since != null ? Instant.parse(since) : null;
        return StepResponse.from(stepResolver.resolve(processInstanceId, sinceInstant));
    }

    @PreAuthorize("hasAnyRole('VIEWER','EDITOR','ADMIN')")
    @PostMapping("/instances/{processInstanceId}/tasks/{taskId}/complete")
    public StepResponse completeTask(@PathVariable String processInstanceId, @PathVariable String taskId,
                                      @RequestBody(required = false) CompleteTaskRequest body) {
        Map<String, Object> answers = body != null ? body.answers() : Map.of();
        return StepResponse.from(completeExecutionTask.execute(processInstanceId, taskId, answers));
    }

    // Chamada bate em /simulate-step — mesmo nome que o front já usa (skipStep), sem relação com
    // "simulação": pula a etapa manualmente, fabricando o resultado.
    @PreAuthorize("hasAnyRole('VIEWER','EDITOR','ADMIN')")
    @PostMapping("/instances/{processInstanceId}/simulate-step")
    public StepResponse simulateStep(@PathVariable String processInstanceId) {
        return StepResponse.from(skipStep.execute(processInstanceId));
    }

    @PreAuthorize("hasAnyRole('VIEWER','EDITOR','ADMIN')")
    @GetMapping("/instances/{processInstanceId}/variables")
    public List<VariableEntryResponse> variables(@PathVariable String processInstanceId) {
        return VariableEntryResponse.from(executionVariables.list(processInstanceId));
    }

    @PreAuthorize("hasAnyRole('VIEWER','EDITOR','ADMIN')")
    @PutMapping("/instances/{processInstanceId}/variables/{name}")
    public List<VariableEntryResponse> setVariable(@PathVariable String processInstanceId, @PathVariable String name,
                                                    @RequestBody SetVariableRequest body) {
        return VariableEntryResponse.from(executionVariables.set(processInstanceId, name, body.value(), body.type()));
    }

    // Só aceito quando a instância foi iniciada com controle manual do Kafka ligado (ver `start`) —
    // senão o worker automático já teria completado essa task sozinho.
    @PreAuthorize("hasAnyRole('VIEWER','EDITOR','ADMIN')")
    @PostMapping("/instances/{processInstanceId}/send-kafka-message")
    public StepResponse sendKafkaMessage(@PathVariable String processInstanceId,
                                          @RequestBody(required = false) SendKafkaMessageRequest body) {
        Object payload = body != null ? body.payload() : null;
        return StepResponse.from(sendKafkaMessage.execute(processInstanceId, payload));
    }

    @PreAuthorize("hasAnyRole('VIEWER','EDITOR','ADMIN')")
    @GetMapping("/instances/{processInstanceId}/kafka-message-preview")
    public Object kafkaMessagePreview(@PathVariable String processInstanceId) {
        return previewKafkaMessage.execute(processInstanceId);
    }

    // Encerra a instância no motor — usado pelo botão "Parar execução", pra não deixar processos
    // abandonados quando o usuário troca de jornada no meio do caminho. Correção: achei que isso já
    // existia em DashboardController e removi daqui na Fatia 1 — na verdade aquele é
    // /api/v1/dashboard/instances/{id} (ação de monitoramento geral), path diferente deste. Sem
    // colisão nenhuma; devolvido.
    @PreAuthorize("hasAnyRole('VIEWER','EDITOR','ADMIN')")
    @DeleteMapping("/instances/{processInstanceId}")
    public ResponseEntity<Void> stop(@PathVariable String processInstanceId) {
        runtimeInstanceControlPort.terminate(processInstanceId);
        return ResponseEntity.noContent().build();
    }

    // Publica de verdade no tópico Kafka do nó — testa o lado de consumo (RECEIVE_TASK/
    // MESSAGE_START_EVENT) sem precisar de produtor externo real.
    @PreAuthorize("hasAnyRole('VIEWER','EDITOR','ADMIN')")
    @PostMapping("/journeys/{journeyId}/nodes/{nodeId}/test-message")
    public void sendTestMessage(@PathVariable UUID journeyId, @PathVariable String nodeId,
                                 @RequestBody TestMessageRequest body) {
        sendTestMessage.execute(journeyId, nodeId, body.correlationId(), body.messageName(), body.data());
    }

    // Usado só depois de enviar uma mensagem de teste pra um MESSAGE_START_EVENT, pra descobrir a
    // instância nova que ela criou (não existe processInstanceId nenhum antes disso).
    @PreAuthorize("hasAnyRole('VIEWER','EDITOR','ADMIN')")
    @GetMapping("/journeys/{journeyId}/latest-instance")
    public ResponseEntity<InstanceResponse> latestInstance(@PathVariable UUID journeyId, @RequestParam String since) {
        return getLatestInstance.execute(journeyId, Instant.parse(since))
                .map(InstanceResponse::from)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    // Busca própria da Execução (não passa pelo Diagnóstico, FT-15) pra reabrir uma instância
    // ACTIVE já em andamento e voltar a interagir com ela ao vivo — ex.: usuário fechou a aba ou
    // atualizou o navegador enquanto uma instância ficou esperando um passo. `query` aceita tanto o
    // processInstanceId quanto o business key.
    @PreAuthorize("hasAnyRole('VIEWER','EDITOR','ADMIN')")
    @GetMapping("/instances/resume")
    public ResumeInstanceResponse resume(@RequestParam String query) {
        return ResumeInstanceResponse.from(resumeExecution.execute(query));
    }
}
