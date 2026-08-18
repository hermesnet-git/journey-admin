package com.jouney.especregistry.simulation;

import com.jouney.especregistry.adminback.AdminBackClient;
import com.jouney.especregistry.adminback.ConnectorConfig;
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
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import tools.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/api/v1")
public class SimulationController {

    private final AdminBackClient adminBackClient;
    private final CamundaClient camundaClient;
    private final StepResolver stepResolver;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public SimulationController(AdminBackClient adminBackClient, CamundaClient camundaClient, StepResolver stepResolver,
                                 KafkaTemplate<String, String> kafkaTemplate) {
        this.adminBackClient = adminBackClient;
        this.camundaClient = camundaClient;
        this.stepResolver = stepResolver;
        this.kafkaTemplate = kafkaTemplate;
    }

    @GetMapping("/journeys")
    public List<JourneySummary> journeys() {
        return adminBackClient.listPublishedJourneys();
    }

    /** Diagrama da jornada sem iniciar instância nenhuma — usado pelo front pra descobrir, ao
     * selecionar uma jornada, se o início é por MESSAGE_START_EVENT (troca o botão "Executar" por
     * um painel de envio de mensagem) antes de decidir como começar a simulação. */
    @GetMapping("/journeys/{journeyId}/flow")
    public FlowBundle flow(@PathVariable UUID journeyId) {
        return FlowBundle.from(adminBackClient.getPublicationSnapshot(journeyId));
    }

    @PostMapping("/journeys/{journeyId}/instances")
    public InstanceResponse start(@PathVariable UUID journeyId,
                                   @RequestBody(required = false) Map<String, Object> variables) {
        // Iniciar por chave funciona igual para START e MESSAGE_START_EVENT (sem correlação de
        // mensagem — testado ao vivo), mas isso pula o payload da mensagem: se o
        // MESSAGE_START_EVENT declarar outputMapping (ex.: ticketId), a variável nunca seria
        // criada. Fabrica os mesmos valores que "Simular conclusão" usaria, já na largada.
        // Já para um START comum (REQ-03.12.003), as variáveis vêm de verdade do chamador
        // (canal digital/BFF) — validadas e coercionadas contra o que o nó START declarou.
        PublicationSnapshot snapshot = adminBackClient.getPublicationSnapshot(journeyId);
        // Catches a journey published before FlowValidator (admin/back) started rejecting this shape
        // at save time — fails clearly here instead of crashing the engine (SynchronousChainCheck).
        SynchronousChainCheck.verify(snapshot);
        Map<String, CamundaVariable> startVariables = snapshot.findStartNode()
                .map(node -> "MESSAGE_START_EVENT".equals(node.type())
                        ? VariableConversion.fabricateFromOutputMapping(node.connectorConfig())
                        : VariableConversion.fromDeclaredVariables(variables, node.startVariables()))
                .orElse(Map.of());

        // Toda instância ganha um businessKey, mesmo iniciada manualmente por aqui — é o que permite
        // uma RECEIVE_TASK dela ser correlacionada depois via mensagem Kafka de verdade (ver
        // KafkaBridgeScheduler/CamundaClient.findProcessInstanceByBusinessKey).
        String businessKey = UUID.randomUUID().toString();
        // Same trail computation completeTask/simulateStep already do: the engine can run several
        // SERVICE_TASK/GATEWAY steps synchronously, in the same transaction as the start call itself
        // (e.g. one or more REST connectors right after START, before the first wait state) — without
        // this, those nodes never show as visited on the diagram even though they genuinely ran.
        Instant before = Instant.now();
        String processInstanceId = camundaClient.startProcessInstance(ProcessIds.keyForJourney(journeyId), startVariables, businessKey);
        StepResponse step = stepResolver.resolve(processInstanceId).withTrail(trailSince(processInstanceId, snapshot, before));
        return new InstanceResponse(processInstanceId, businessKey, FlowBundle.from(snapshot), step);
    }

    /** Publica de verdade no tópico Kafka configurado no nó — usado pelo painel "Enviar mensagem"
     * do simulador pra testar o lado de consumo (RECEIVE_TASK/MESSAGE_START_EVENT) sem precisar de
     * um produtor externo real. Mesmo tópico que o bridge (KafkaBridgeScheduler) já descobre e
     * escuta sozinho — não precisa de nenhuma correlação aqui, é só publicar; o consumo acontece
     * pelo mesmo caminho automático de sempre. */
    @PostMapping("/journeys/{journeyId}/nodes/{nodeId}/test-message")
    public void sendTestMessage(@PathVariable UUID journeyId, @PathVariable String nodeId,
                                 @RequestBody Map<String, Object> payload) {
        PublicationSnapshot snapshot = adminBackClient.getPublicationSnapshot(journeyId);
        FlowNode node = snapshot.findNode(nodeId)
                .orElseThrow(() -> new IllegalStateException("Nó " + nodeId + " não encontrado no snapshot da jornada"));
        ConnectorConfig connectorConfig = node.connectorConfig();
        if (connectorConfig == null || !"KAFKA".equalsIgnoreCase(connectorConfig.connectorType())) {
            throw new IllegalStateException("Nó " + nodeId + " não tem conector Kafka configurado");
        }
        Object topic = connectorConfig.config() != null ? connectorConfig.config().get("topic") : null;
        if (!(topic instanceof String topicName) || topicName.isBlank()) {
            throw new IllegalStateException("Nó " + nodeId + " não tem tópico Kafka configurado");
        }
        kafkaTemplate.send(topicName, objectMapper.writeValueAsString(payload));
    }

    /** Instância mais nova de uma jornada iniciada depois de {@code since} — usado pelo front pra
     * saber quando uma mensagem de teste enviada pra um MESSAGE_START_EVENT efetivamente iniciou
     * uma instância nova (não existe processInstanceId nenhum antes disso pra fazer polling em
     * cima). 204 enquanto nada apareceu ainda. */
    @GetMapping("/journeys/{journeyId}/latest-instance")
    public ResponseEntity<InstanceResponse> latestInstance(@PathVariable UUID journeyId, @RequestParam String since) {
        String processDefinitionKey = ProcessIds.keyForJourney(journeyId);
        Optional<String> processInstanceId = camundaClient.findMostRecentInstanceStartedAfter(processDefinitionKey, Instant.parse(since));
        if (processInstanceId.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        ProcessInstanceInfo instance = camundaClient.getProcessInstance(processInstanceId.get())
                .orElseThrow(() -> new IllegalStateException("Instância " + processInstanceId.get() + " não encontrada"));
        PublicationSnapshot snapshot = adminBackClient.getPublicationSnapshot(journeyId);
        return ResponseEntity.ok(new InstanceResponse(instance.id(), instance.businessKey(), FlowBundle.from(snapshot),
                stepResolver.resolve(instance.id())));
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
        SynchronousChainCheck.verify(snapshot);

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
        SynchronousChainCheck.verify(snapshot);
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

    // Same two prefixes BpmnTransformer (ms-transform-publication) writes into process variables for
    // every REST-connector SERVICE_TASK — keep in sync if either changes, no shared module between
    // the two services.
    private static final String HTTP_URL_VAR_PREFIX = "__httpUrl__";
    private static final String HTTP_RESPONSE_VAR_PREFIX = "__httpResponse__";

    private List<TrailEntry> trailSince(String processInstanceId, PublicationSnapshot snapshot, Instant since) {
        List<TrailEntry> trail = new ArrayList<>();
        Map<String, CamundaVariable> variables = null;
        for (HistoricActivityInstance activity : camundaClient.getActivityHistorySince(processInstanceId, since)) {
            if (activity.endTime() == null || BOUNDARY_ACTIVITY_TYPES.contains(activity.activityType())) {
                continue;
            }
            Optional<FlowNode> node = snapshot.findNode(activity.activityId());
            if (node.isEmpty()) {
                continue;
            }
            String url = null;
            String response = null;
            if ("SERVICE_TASK".equals(node.get().type())) {
                if (variables == null) {
                    variables = camundaClient.getProcessVariables(processInstanceId);
                }
                url = stringValue(variables.get(HTTP_URL_VAR_PREFIX + node.get().id()));
                response = stringValue(variables.get(HTTP_RESPONSE_VAR_PREFIX + node.get().id()));
            }
            trail.add(new TrailEntry(node.get().id(), node.get().name(), node.get().type(), url, response));
        }
        return trail;
    }

    private String stringValue(CamundaVariable variable) {
        return variable != null && variable.value() != null ? String.valueOf(variable.value()) : null;
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
