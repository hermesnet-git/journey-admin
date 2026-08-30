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
import com.jouney.especregistry.kafka.KafkaMessagePublisher;
import com.jouney.especregistry.kafka.PublishedKafkaMessage;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.web.bind.annotation.DeleteMapping;
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
    private final KafkaMessagePublisher kafkaMessagePublisher;
    private final StartFailureDiagnostic startFailureDiagnostic;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public SimulationController(AdminBackClient adminBackClient, CamundaClient camundaClient, StepResolver stepResolver,
                                 KafkaTemplate<String, String> kafkaTemplate, KafkaMessagePublisher kafkaMessagePublisher,
                                 StartFailureDiagnostic startFailureDiagnostic) {
        this.adminBackClient = adminBackClient;
        this.camundaClient = camundaClient;
        this.stepResolver = stepResolver;
        this.kafkaTemplate = kafkaTemplate;
        this.kafkaMessagePublisher = kafkaMessagePublisher;
        this.startFailureDiagnostic = startFailureDiagnostic;
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
                                   @RequestParam(defaultValue = "false") boolean manualKafkaControl,
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
        if (manualKafkaControl) {
            // Setado antes do processo existir, não depois de chegar num Service Task Kafka: é o
            // único jeito de garantir que o worker Kafka do ms-journey (roda a cada 3s, sem saber se
            // alguém está olhando a tela de Execução, e aponta pro mesmo Camunda) nunca publique
            // sozinho numa instância que o usuário marcou pra controlar na mão.
            startVariables = new LinkedHashMap<>(startVariables);
            startVariables.put(KafkaMessagePublisher.MANUAL_KAFKA_CONTROL_VAR, new CamundaVariable(Boolean.TRUE, "Boolean"));
        }

        // Toda instância ganha um businessKey, mesmo iniciada manualmente por aqui — é o que permite
        // uma RECEIVE_TASK dela ser correlacionada depois via mensagem Kafka de verdade (ver worker
        // Kafka do ms-journey / CamundaClient.findProcessInstanceByBusinessKey).
        String businessKey = UUID.randomUUID().toString();
        // Same trail computation completeTask/simulateStep already do: the engine can run several
        // SERVICE_TASK/GATEWAY steps synchronously, in the same transaction as the start call itself
        // (e.g. one or more REST connectors right after START, before the first wait state) — without
        // this, those nodes never show as visited on the diagram even though they genuinely ran.
        Instant before = Instant.now();
        String processInstanceId;
        try {
            processInstanceId = camundaClient.startProcessInstance(ProcessIds.keyForJourney(journeyId), startVariables, businessKey);
        } catch (RestClientException ex) {
            // Same shape GlobalExceptionHandler's isSpinJsonPathFailure recognizes for other endpoints
            // — here, in start() itself, the snapshot/variables that produced it are still in scope,
            // so the replay can run right away and the front gets the exact node in this one response
            // instead of a generic message plus a second round trip.
            if (ex.getMessage() != null && ex.getMessage().contains("SpinJsonPathException")) {
                throw new StartFailureDiagnosedException(ex.getMessage(), startFailureDiagnostic.run(snapshot, startVariables));
            }
            throw ex;
        }
        StepResponse step = stepResolver.resolve(processInstanceId).withTrail(trailSince(processInstanceId, snapshot, before));
        return new InstanceResponse(processInstanceId, businessKey, FlowBundle.from(snapshot), step, manualKafkaControl);
    }

    /** Publica de verdade no tópico Kafka do Service Task atual — só aceito quando a instância foi
     * iniciada com controle manual ligado (senão o worker automático já teria completado essa task
     * sozinho, e essa chamada nunca encontraria nada pendente). {@code payload} ausente pede pro
     * corpo ser resolvido igual ao worker faria (o botão "Gerar automaticamente" da tela de
     * Execução); presente é o texto digitado pelo usuário. */
    @PostMapping("/instances/{processInstanceId}/send-kafka-message")
    public StepResponse sendKafkaMessage(@PathVariable String processInstanceId,
                                          @RequestBody(required = false) SendKafkaMessageRequest request) {
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
        ConnectorConfig connectorConfig = node.connectorConfig();
        if (!"SERVICE_TASK".equals(node.type()) || connectorConfig == null || !"KAFKA".equalsIgnoreCase(connectorConfig.connectorType())) {
            throw new IllegalStateException("Nó " + node.id() + " não é um Service Task com conector Kafka");
        }

        Map<String, CamundaVariable> rawVariables = camundaClient.getProcessVariables(processInstanceId);
        CamundaVariable manualFlag = rawVariables.get(KafkaMessagePublisher.MANUAL_KAFKA_CONTROL_VAR);
        if (manualFlag == null || !Boolean.TRUE.equals(manualFlag.value())) {
            throw new IllegalStateException(
                    "Instância " + processInstanceId + " não foi iniciada com controle manual do Kafka — o worker automático já cuida dela");
        }

        Object payloadOverride = request != null ? request.payload() : null;
        Instant before = Instant.now();
        try {
            PublishedKafkaMessage published = kafkaMessagePublisher.publish(processInstanceId, connectorConfig, rawVariables, payloadOverride);
            camundaClient.completeExternalTask(processInstanceId, node.id(), kafkaMessagePublisher.completionVariables(node.id(), published));
        } catch (RestClientException ex) {
            // Ao contrário de completeTask/simulateStep (onde o nó que falhou é incerto, por causa do
            // rollback da engine — daí o errorResponse() com heurística), aqui não há ambiguidade: o
            // node atual É o que acabou de falhar ao completar, não "o próximo depois dele".
            return current.withError(node.id(), node.name(), errorMessageFrom(ex), connectorConfig);
        } catch (Exception e) {
            throw new IllegalStateException("Falha ao publicar mensagem Kafka: " + e.getMessage(), e);
        }
        StepResponse next = stepResolver.resolve(processInstanceId);
        return next.withTrail(trailSince(processInstanceId, snapshot, before));
    }

    /** Só resolve o payload que "Gerar automaticamente" enviaria, sem publicar nada — usado pra
     * pré-preencher o editor de "Inserir manualmente" com um JSON válido de partida (o corpo real
     * que o worker mandaria) em vez de abrir em branco e depender do usuário lembrar o formato
     * esperado de cor. */
    @GetMapping("/instances/{processInstanceId}/kafka-message-preview")
    public Object previewKafkaMessage(@PathVariable String processInstanceId) {
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
        ConnectorConfig connectorConfig = node.connectorConfig();
        if (!"SERVICE_TASK".equals(node.type()) || connectorConfig == null || !"KAFKA".equalsIgnoreCase(connectorConfig.connectorType())) {
            throw new IllegalStateException("Nó " + node.id() + " não é um Service Task com conector Kafka");
        }

        Map<String, CamundaVariable> rawVariables = camundaClient.getProcessVariables(processInstanceId);
        return kafkaMessagePublisher.resolvePayload(connectorConfig, rawVariables);
    }

    /** Publica de verdade no tópico Kafka configurado no nó — usado pelo painel "Enviar mensagem"
     * do simulador pra testar o lado de consumo (RECEIVE_TASK/MESSAGE_START_EVENT) sem precisar de
     * um produtor externo real. Mesmo tópico que o worker Kafka do ms-journey já descobre e escuta
     * sozinho (aponta pro mesmo broker) — não precisa de nenhuma correlação aqui, é só publicar; o
     * consumo acontece pelo mesmo caminho automático de sempre. */
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
        // Instância iniciada por uma mensagem externa (MESSAGE_START_EVENT), nunca pelo botão
        // "Iniciar" desta tela — não houve momento nenhum pra oferecer o toggle de controle manual.
        return ResponseEntity.ok(new InstanceResponse(instance.id(), instance.businessKey(), FlowBundle.from(snapshot),
                stepResolver.resolve(instance.id()), false));
    }

    /** {@code since} (ISO 8601) opcional: quando presente, computa a trilha de nós que o worker
     * automático rodou sozinho desde então — sem isso, o polling da tela de Execução nunca saberia
     * que um Service Task Kafka rodou em segundo plano (só as chamadas diretas — completar User
     * Task, simulate-step, send-kafka-message — computavam trilha até agora). */
    @GetMapping("/instances/{processInstanceId}/current-step")
    public StepResponse currentStep(@PathVariable String processInstanceId, @RequestParam(required = false) String since) {
        StepResponse current = stepResolver.resolve(processInstanceId);
        if (since == null) {
            return current;
        }
        ProcessInstanceInfo instance = camundaClient.getProcessInstance(processInstanceId).orElse(null);
        if (instance == null) {
            return current;
        }
        UUID journeyId = ProcessIds.journeyIdFromKey(instance.definitionKey());
        PublicationSnapshot snapshot = adminBackClient.getPublicationSnapshot(journeyId);
        return current.withTrail(trailSince(processInstanceId, snapshot, Instant.parse(since)));
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
                describeRequest(failedNode) + errorMessageFrom(ex),
                failedNode != null ? failedNode.connectorConfig() : null);
    }

    private String errorMessageFrom(RestClientException ex) {
        if (ex instanceof HttpStatusCodeException httpEx && !httpEx.getResponseBodyAsString().isBlank()) {
            return httpEx.getResponseBodyAsString();
        }
        return ex.getMessage();
    }

    // O erro que volta da engine (ex.: "HTCL-02007 Unable to execute HTTP request") não diz pra
    // onde a chamada ia — sem isso não dá pra saber, só olhando o log, se o problema é a URL
    // configurada no nó, uma variável não resolvida, ou algo do lado do servidor de destino.
    // Prefixa com o que o conector do nó de fato tentou chamar (método+URL/tópico), antes de
    // qualquer resolução de {{variável}} — a variável já resolvida não sobrevive ao rollback da
    // transação, só o que está salvo no fluxo mesmo.
    private String describeRequest(FlowNode failedNode) {
        if (failedNode == null || failedNode.connectorConfig() == null) {
            return "";
        }
        ConnectorConfig connectorConfig = failedNode.connectorConfig();
        Map<String, Object> config = connectorConfig.config();
        if (config == null) {
            return "";
        }
        if ("REST".equalsIgnoreCase(connectorConfig.connectorType()) && config.get("url") instanceof String url && !url.isBlank()) {
            String method = config.get("method") instanceof String m && !m.isBlank() ? m : "GET";
            return method + " " + url + " — ";
        }
        if (config.get("topic") instanceof String topic && !topic.isBlank()) {
            return "tópico " + topic + " — ";
        }
        return "";
    }

    // Nós que o motor atravessou sozinho (sem parar) desde `since` — SERVICE_TASK, gateway, e o END
    // efetivamente alcançado quando a jornada termina numa dessas transições. Só entram atividades
    // já concluídas (endTime != null): a própria User Task/etapa de espera nova ainda não tem
    // endTime nesse ponto, e já é reportada separadamente como o passo atual.
    private static final Set<String> BOUNDARY_ACTIVITY_TYPES = Set.of("startEvent");

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
            String method = null;
            String requestHeaders = null;
            String requestBody = null;
            String kafkaTopic = null;
            String kafkaPayload = null;
            if ("SERVICE_TASK".equals(node.get().type())) {
                ConnectorConfig connectorConfig = node.get().connectorConfig();
                if (connectorConfig != null && "REST".equalsIgnoreCase(connectorConfig.connectorType())) {
                    // ms-runtime-camunda's HttpConnectorDelegate sets url/method/headers/payload/response
                    // as ordinary local variables on this node's own activity instance (standard
                    // camunda:inputOutput mapping, not the native http-connector — see BpmnTransformer.
                    // attachHttpConnector for why) — genuinely scoped per node, so plain names never
                    // collide between REST nodes, and no __httpXxx__ reserved naming is needed here.
                    Map<String, CamundaVariable> local = camundaClient.getLocalVariablesForActivity(activity.id());
                    url = stringValue(local.get("url"));
                    method = stringValue(local.get("method"));
                    requestHeaders = stringValue(local.get("headers"));
                    requestBody = stringValue(local.get("payload"));
                    response = stringValue(local.get("response"));
                } else {
                    if (variables == null) {
                        variables = camundaClient.getProcessVariables(processInstanceId);
                    }
                    kafkaTopic = stringValue(variables.get(KafkaMessagePublisher.KAFKA_TOPIC_VAR_PREFIX + node.get().id()));
                    kafkaPayload = stringValue(variables.get(KafkaMessagePublisher.KAFKA_PAYLOAD_VAR_PREFIX + node.get().id()));
                }
            }
            trail.add(new TrailEntry(node.get().id(), node.get().name(), node.get().type(), url, response, method,
                    requestHeaders, requestBody, kafkaTopic, kafkaPayload));
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

    /** Encerra a instância em execução — usado pelo botão "Parar execução" da UI pra não deixar a
     * engine com processos abandonados quando o usuário troca de jornada no meio do caminho. */
    @DeleteMapping("/instances/{processInstanceId}")
    public void stop(@PathVariable String processInstanceId) {
        camundaClient.deleteProcessInstance(processInstanceId);
    }

    private List<VariableEntry> toEntries(Map<String, CamundaVariable> variables) {
        List<VariableEntry> entries = new ArrayList<>();
        variables.forEach((name, v) -> entries.add(new VariableEntry(name, v.value(), v.type())));
        return entries;
    }
}
