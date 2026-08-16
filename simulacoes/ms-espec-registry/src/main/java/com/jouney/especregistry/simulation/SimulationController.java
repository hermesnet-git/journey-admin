package com.jouney.especregistry.simulation;

import com.jouney.especregistry.adminback.AdminBackClient;
import com.jouney.especregistry.adminback.FlowNode;
import com.jouney.especregistry.adminback.JourneySummary;
import com.jouney.especregistry.adminback.PublicationSnapshot;
import com.jouney.especregistry.camunda.CamundaClient;
import com.jouney.especregistry.camunda.CamundaVariable;
import com.jouney.especregistry.camunda.HistoricActivityInstance;
import com.jouney.especregistry.camunda.ProcessIds;
import com.jouney.especregistry.camunda.ProcessInstanceInfo;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;

@RestController
@RequestMapping("/api/v1")
public class SimulationController {

    private final AdminBackClient adminBackClient;
    private final CamundaClient camundaClient;
    private final StepResolver stepResolver;

    public SimulationController(AdminBackClient adminBackClient, CamundaClient camundaClient, StepResolver stepResolver) {
        this.adminBackClient = adminBackClient;
        this.camundaClient = camundaClient;
        this.stepResolver = stepResolver;
    }

    @GetMapping("/journeys")
    public List<JourneySummary> journeys() {
        return adminBackClient.listPublishedJourneys();
    }

    @PostMapping("/journeys/{journeyId}/instances")
    public InstanceResponse start(@PathVariable UUID journeyId) {
        // Iniciar por chave funciona igual para START e MESSAGE_START_EVENT (sem correlação de
        // mensagem — testado ao vivo), mas isso pula o payload da mensagem: se o
        // MESSAGE_START_EVENT declarar outputMapping (ex.: ticketId), a variável nunca seria
        // criada. Fabrica os mesmos valores que "Simular conclusão" usaria, já na largada.
        PublicationSnapshot snapshot = adminBackClient.getPublicationSnapshot(journeyId);
        Map<String, CamundaVariable> startVariables = snapshot.findStartNode()
                .filter(node -> "MESSAGE_START_EVENT".equals(node.type()))
                .map(node -> VariableConversion.fabricateFromOutputMapping(node.connectorConfig()))
                .orElse(Map.of());

        String processInstanceId = camundaClient.startProcessInstance(ProcessIds.keyForJourney(journeyId), startVariables);
        return new InstanceResponse(processInstanceId, FlowBundle.from(snapshot), stepResolver.resolve(processInstanceId));
    }

    @GetMapping("/instances/{processInstanceId}/current-step")
    public StepResponse currentStep(@PathVariable String processInstanceId) {
        return stepResolver.resolve(processInstanceId);
    }

    @PostMapping("/instances/{processInstanceId}/tasks/{taskId}/complete")
    public StepResponse completeTask(@PathVariable String processInstanceId, @PathVariable String taskId,
                                      @RequestBody(required = false) CompleteTaskRequest request) {
        StepResponse current = stepResolver.resolve(processInstanceId);
        if (!"USER_TASK".equals(current.type()) || !taskId.equals(current.taskId())) {
            throw new IllegalStateException(
                    "Task " + taskId + " não é o passo ativo atual da instância " + processInstanceId);
        }
        ProcessInstanceInfo instance = camundaClient.getProcessInstance(processInstanceId)
                .orElseThrow(() -> new IllegalStateException("Instância de processo não encontrada: " + processInstanceId));
        UUID journeyId = ProcessIds.journeyIdFromKey(instance.definitionKey());
        PublicationSnapshot snapshot = adminBackClient.getPublicationSnapshot(journeyId);

        Map<String, Object> answers = request != null && request.answers() != null ? request.answers() : Map.of();
        Map<String, CamundaVariable> variables = VariableConversion.fromAnswers(current.form().sdui(), answers);
        Instant before = Instant.now();
        try {
            camundaClient.completeTask(taskId, variables);
        } catch (RestClientException ex) {
            return errorResponse(current, snapshot, ex);
        }
        StepResponse next = stepResolver.resolve(processInstanceId);
        return next.withTrail(trailSince(processInstanceId, snapshot, before));
    }

    @PostMapping("/instances/{processInstanceId}/simulate-step")
    public StepResponse simulateStep(@PathVariable String processInstanceId) {
        StepResponse current = stepResolver.resolve(processInstanceId);
        if (!"WAITING".equals(current.type())) {
            throw new IllegalStateException(
                    "Instância " + processInstanceId + " não está aguardando um passo não-usuário");
        }

        ProcessInstanceInfo instance = camundaClient.getProcessInstance(processInstanceId)
                .orElseThrow(() -> new IllegalStateException("Instância de processo não encontrada: " + processInstanceId));
        UUID journeyId = ProcessIds.journeyIdFromKey(instance.definitionKey());
        PublicationSnapshot snapshot = adminBackClient.getPublicationSnapshot(journeyId);
        FlowNode node = snapshot.findNode(current.nodeId())
                .orElseThrow(() -> new IllegalStateException("Nó " + current.nodeId() + " não encontrado no snapshot da jornada"));

        Map<String, CamundaVariable> variables = VariableConversion.fabricateFromOutputMapping(node.connectorConfig());
        Instant before = Instant.now();
        try {
            if ("RECEIVE_TASK".equals(node.type())) {
                camundaClient.correlateMessage("Message_" + node.id(), processInstanceId, variables);
            } else {
                camundaClient.completeExternalTask(processInstanceId, node.id(), variables);
            }
        } catch (RestClientException ex) {
            return errorResponse(current, snapshot, ex);
        }
        StepResponse next = stepResolver.resolve(processInstanceId);
        return next.withTrail(trailSince(processInstanceId, snapshot, before));
    }

    // A transação da engine dá rollback inteira quando um conector falha no meio da continuação —
    // nada avança, e nada fica registrado no histórico pro nó que efetivamente falhou. Como nossos
    // fluxos nunca têm paralelismo, o próximo nó com conector a partir do passo atual é a melhor
    // hipótese de onde a falha aconteceu (é o único tipo de nó capaz de lançar esse tipo de erro).
    private StepResponse errorResponse(StepResponse current, PublicationSnapshot snapshot, RestClientException ex) {
        FlowNode failedNode = snapshot.nextConnectorNodeAfter(current.nodeId()).orElse(null);
        return current.withError(
                failedNode != null ? failedNode.id() : null,
                failedNode != null ? failedNode.name() : null,
                errorMessageFrom(ex));
    }

    private String errorMessageFrom(RestClientException ex) {
        if (ex instanceof HttpStatusCodeException httpEx && !httpEx.getResponseBodyAsString().isBlank()) {
            return httpEx.getResponseBodyAsString();
        }
        return ex.getMessage();
    }

    // Nós que o motor atravessou sozinho (sem parar) desde `since` — SERVICE_TASK, gateway, e o END
    // efetivamente alcançado quando a jornada termina numa dessas transições. Só entram atividades
    // já concluídas (endTime != null): a própria User Task/etapa de espera nova ainda não tem
    // endTime nesse ponto, e já é reportada separadamente como o passo atual.
    private static final Set<String> BOUNDARY_ACTIVITY_TYPES = Set.of("startEvent");

    private List<TrailEntry> trailSince(String processInstanceId, PublicationSnapshot snapshot, Instant since) {
        List<TrailEntry> trail = new ArrayList<>();
        for (HistoricActivityInstance activity : camundaClient.getActivityHistorySince(processInstanceId, since)) {
            if (activity.endTime() == null || BOUNDARY_ACTIVITY_TYPES.contains(activity.activityType())) {
                continue;
            }
            snapshot.findNode(activity.activityId())
                    .ifPresent(n -> trail.add(new TrailEntry(n.id(), n.name(), n.type())));
        }
        return trail;
    }

    @GetMapping("/instances/{processInstanceId}/variables")
    public List<VariableEntry> variables(@PathVariable String processInstanceId) {
        return toEntries(camundaClient.getProcessVariables(processInstanceId));
    }

    @PutMapping("/instances/{processInstanceId}/variables/{name}")
    public List<VariableEntry> setVariable(@PathVariable String processInstanceId, @PathVariable String name,
                                            @RequestBody SetVariableRequest request) {
        camundaClient.setProcessVariable(processInstanceId, name, new CamundaVariable(request.value(), request.type()));
        return toEntries(camundaClient.getProcessVariables(processInstanceId));
    }

    private List<VariableEntry> toEntries(Map<String, CamundaVariable> variables) {
        List<VariableEntry> entries = new ArrayList<>();
        variables.forEach((name, v) -> entries.add(new VariableEntry(name, v.value(), v.type())));
        return entries;
    }
}
