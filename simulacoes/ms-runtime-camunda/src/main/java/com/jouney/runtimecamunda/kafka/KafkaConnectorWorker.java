package com.jouney.runtimecamunda.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jayway.jsonpath.JsonPath;
import com.jayway.jsonpath.PathNotFoundException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.camunda.bpm.engine.ExternalTaskService;
import org.camunda.bpm.engine.MismatchingMessageCorrelationException;
import org.camunda.bpm.engine.RuntimeService;
import org.camunda.bpm.engine.externaltask.ExternalTask;
import org.camunda.bpm.engine.externaltask.ExternalTaskQueryBuilder;
import org.camunda.bpm.engine.externaltask.LockedExternalTask;
import org.camunda.bpm.engine.runtime.ProcessInstance;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Worker do conector Kafka: o motor só resolve REST sozinho (HttpConnectorDelegate, síncrono); um
 * SERVICE_TASK Kafka vira External Task pendente (BpmnTransformer.attachServiceTask, ms-transform-
 * publication) que este worker busca/trava/completa a cada tick, e um RECEIVE_TASK/MESSAGE_START_EVENT
 * Kafka é descoberto direto no BPMN implantado ({@link KafkaConsumerNodeDiscovery}) e correlacionado
 * quando uma mensagem real chega — tudo via a API Java do próprio engine embutido, nenhuma chamada a
 * outro serviço. Um único método {@code @Scheduled} (não dois) garante que produção e consumo nunca
 * rodem ao mesmo tempo, mesmo que o pool do scheduler mude no futuro — o KafkaConsumer não é
 * thread-safe.
 *
 * Movido de ms-espec-registry (que mantinha esse worker só pra alimentar a aba Execução/debug do
 * admin, chamando de volta o próprio Camunda por REST): {@link #MANUAL_KAFKA_CONTROL_VAR} continua
 * existindo e é respeitado aqui — uma instância de debug marcada como manual não pode ser tocada por
 * este worker, mesmo ele agora rodando dentro do próprio motor.
 */
@Component
public class KafkaConnectorWorker {

    private static final Logger log = LoggerFactory.getLogger(KafkaConnectorWorker.class);
    private static final String WORKER_ID = "kafka-connector-worker";
    private static final String KAFKA_TOPIC_PREFIX = "kafka-";

    /** Mesmo nome de variável que o ms-espec-registry usa (SimulationController.start) pra marcar
     * uma instância de debug como fora do piloto automático deste worker. */
    public static final String MANUAL_KAFKA_CONTROL_VAR = "__kafkaManualControl__";
    private static final String KAFKA_TOPIC_VAR_PREFIX = "__kafkaTopic__";
    private static final String KAFKA_PAYLOAD_VAR_PREFIX = "__kafkaPayload__";

    private final ExternalTaskService externalTaskService;
    private final RuntimeService runtimeService;
    private final KafkaConsumerNodeDiscovery consumerNodeDiscovery;
    private final VariableTemplateResolver templateResolver;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final KafkaConsumer<String, String> kafkaConsumer;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private Set<String> subscribedTopics = Set.of();

    public KafkaConnectorWorker(ExternalTaskService externalTaskService, RuntimeService runtimeService,
                                 KafkaConsumerNodeDiscovery consumerNodeDiscovery, VariableTemplateResolver templateResolver,
                                 KafkaTemplate<String, String> kafkaTemplate, KafkaConsumer<String, String> kafkaConsumer) {
        this.externalTaskService = externalTaskService;
        this.runtimeService = runtimeService;
        this.consumerNodeDiscovery = consumerNodeDiscovery;
        this.templateResolver = templateResolver;
        this.kafkaTemplate = kafkaTemplate;
        this.kafkaConsumer = kafkaConsumer;
    }

    @Scheduled(fixedDelay = 3000)
    public void tick() {
        produceTick();
        consumeTick();
    }

    private void produceTick() {
        Set<String> pendingTopics = externalTaskService.createExternalTaskQuery().active().notLocked().list().stream()
                .map(ExternalTask::getTopicName)
                .filter(topic -> topic.startsWith(KAFKA_TOPIC_PREFIX))
                .collect(Collectors.toSet());
        if (pendingTopics.isEmpty()) {
            return;
        }

        ExternalTaskQueryBuilder fetchBuilder = externalTaskService.fetchAndLock(50, WORKER_ID);
        for (String topic : pendingTopics) {
            fetchBuilder = fetchBuilder.topic(topic, 30000).variables("topic", "payload", "payloadMode", "headers");
        }
        List<LockedExternalTask> locked = fetchBuilder.execute();

        for (LockedExternalTask task : locked) {
            try {
                Map<String, Object> processVariables = runtimeService.getVariables(task.getProcessInstanceId());
                if (Boolean.TRUE.equals(processVariables.get(MANUAL_KAFKA_CONTROL_VAR))) {
                    // Reservado pro envio manual da tela de Execução do admin (ms-espec-registry,
                    // SimulationController.sendKafkaMessage) — não completa nem publica sozinho.
                    externalTaskService.unlock(task.getId());
                    continue;
                }
                publishAndComplete(task, processVariables);
            } catch (Exception e) {
                // Deixa a task travada — expira o lock (30s) e volta a ser pega no próximo tick.
                log.error("Falha ao publicar mensagem Kafka pro nó {} (instância {}): {}",
                        task.getActivityId(), task.getProcessInstanceId(), e.getMessage(), e);
            }
        }
    }

    private void publishAndComplete(LockedExternalTask task, Map<String, Object> processVariables) throws Exception {
        Map<String, String> vars = stringify(processVariables);
        String topic = templateResolver.resolve(asString(task.getVariables().get("topic")), vars);
        if (topic == null || topic.isBlank()) {
            throw new IllegalStateException("Tópico Kafka não configurado");
        }
        Object resolvedPayload;
        // "CUSTOM" precisa ser explícito pra cair no payload configurado — qualquer outra coisa,
        // inclusive a chave ausente (nó salvo antes desse campo existir, ou nunca reaberto no
        // assistente), tem que se comportar como automático. O inverso (exigir "GENERIC_DUMP"
        // explícito) faz um nó sem payloadMode nenhum publicar payload.data vazio silenciosamente,
        // já que também não tem "payload" configurado — igual ao front, que já assume ausência de
        // payloadMode como automático (ver ConnectorWizard.tsx).
        if ("CUSTOM".equals(asString(task.getVariables().get("payloadMode")))) {
            Object rawPayload = parseJsonIfPresent(asString(task.getVariables().get("payload")));
            resolvedPayload = templateResolver.resolveDeep(rawPayload, vars);
        } else {
            // Réplica do ServiceBusTopic do wf-journey-v1: nenhum payload configurado, dump de toda
            // variável de processo — exceto as reservadas deste worker (prefixo "__"), que são
            // bookkeeping interno da tela de Execução/Diagnóstico, não dado de negócio.
            resolvedPayload = processVariables.entrySet().stream()
                    .filter(e -> !e.getKey().startsWith("__"))
                    .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue, (a, b) -> a, LinkedHashMap::new));
        }
        EventMessageDTO envelope = buildEnvelope(task, resolvedPayload, processVariables);
        String payloadJson = objectMapper.writeValueAsString(envelope);

        ProducerRecord<String, String> record = new ProducerRecord<>(topic, task.getProcessInstanceId(), payloadJson);
        Object rawHeaders = parseJsonIfPresent(asString(task.getVariables().get("headers")));
        if (rawHeaders instanceof Map<?, ?> headers) {
            headers.forEach((k, v) -> {
                Object resolvedValue = templateResolver.resolveDeep(v, vars);
                record.headers().add(String.valueOf(k), String.valueOf(resolvedValue).getBytes(StandardCharsets.UTF_8));
            });
        }
        kafkaTemplate.send(record).get(5, TimeUnit.SECONDS);

        String nodeId = task.getActivityId();
        // Variáveis de PROCESSO reservadas, de propósito: o worker completa de forma assíncrona
        // (fetchAndLock/complete), então precisam sobreviver além do escopo da própria atividade —
        // lidas de volta pela trilha do log de execução do admin (SimulationController.trailSince,
        // ms-espec-registry), que consulta o mesmo Camunda independente de quem publicou.
        Map<String, Object> completionVariables = Map.of(
                KAFKA_TOPIC_VAR_PREFIX + nodeId, topic,
                KAFKA_PAYLOAD_VAR_PREFIX + nodeId, payloadJson);
        externalTaskService.complete(task.getId(), WORKER_ID, completionVariables);
        log.info("Publicado no tópico Kafka pelo worker automático (nó {}, instância {})", nodeId, task.getProcessInstanceId());
    }

    /** Mesmo envelope do wf-journey-v1 ({@code EventMenssageMapper.toEventMessageDTO}): {@code status}/
     * {@code code} saem do payload configurado no BPMN e viram campos de topo; o resto cai em
     * {@code payload.data}. {@code correlationId} é o processInstanceId, {@code messageName} é opcional
     * (variável de processo "messageName", se o autor da jornada tiver configurado uma). */
    private EventMessageDTO buildEnvelope(LockedExternalTask task, Object resolvedPayload, Map<String, Object> processVariables) {
        Map<String, Object> data = new LinkedHashMap<>();
        if (resolvedPayload instanceof Map<?, ?> map) {
            map.forEach((k, v) -> data.put(String.valueOf(k), v));
        } else if (resolvedPayload != null) {
            data.put("value", resolvedPayload);
        }
        String status = asString(data.remove("status"));
        String code = asString(data.remove("code"));
        String messageName = asString(processVariables.get("messageName"));
        return new EventMessageDTO(task.getProcessInstanceId(), messageName, new PayloadMessageDTO(status, code, data));
    }

    private void consumeTick() {
        List<ConsumerNode> consumerNodes = consumerNodeDiscovery.discover();
        Map<String, List<ConsumerNode>> byTopic = new LinkedHashMap<>();
        consumerNodes.forEach(node -> byTopic.computeIfAbsent(node.topic(), t -> new ArrayList<>()).add(node));

        if (!byTopic.keySet().equals(subscribedTopics)) {
            if (byTopic.isEmpty()) {
                kafkaConsumer.unsubscribe();
            } else {
                kafkaConsumer.subscribe(byTopic.keySet());
            }
            subscribedTopics = byTopic.keySet();
            log.info("Inscrito nos tópicos Kafka de consumo: {}", subscribedTopics);
        }
        if (byTopic.isEmpty()) {
            return;
        }

        ConsumerRecords<String, String> records = kafkaConsumer.poll(Duration.ofMillis(500));
        for (ConsumerRecord<String, String> record : records) {
            for (ConsumerNode node : byTopic.getOrDefault(record.topic(), List.of())) {
                try {
                    consume(record.value(), node);
                } catch (Exception e) {
                    log.error("Falha ao processar mensagem Kafka do tópico '{}' pro nó {} (processo {}): {}",
                            record.topic(), node.nodeId(), node.processDefinitionKey(), e.getMessage(), e);
                }
            }
        }
    }

    private void consume(String jsonBody, ConsumerNode node) {
        EventMessageDTO envelope;
        try {
            envelope = objectMapper.readValue(jsonBody, EventMessageDTO.class);
        } catch (Exception e) {
            log.warn("Mensagem Kafka pro nó {} (processo {}) não é um EventMessageDTO válido — ignorando: {}",
                    node.nodeId(), node.processDefinitionKey(), e.getMessage());
            return;
        }
        String correlationId = envelope.correlationId();
        if (correlationId == null || correlationId.isBlank()) {
            log.warn("Mensagem Kafka pro nó {} (processo {}) não tem 'correlationId' — não há como saber a qual instância correlacionar",
                    node.nodeId(), node.processDefinitionKey());
            return;
        }

        Map<String, Object> variables = buildVariables(envelope);
        variables.putAll(resolveOutputMapping(jsonBody, node.outputMapping()));

        if ("MESSAGE_START_EVENT".equals(node.nodeType())) {
            ProcessInstance instance = runtimeService.startProcessInstanceByKey(node.processDefinitionKey(), correlationId, variables);
            log.info("Jornada iniciada por mensagem Kafka: nó {} (processo {}) -> instância {}",
                    node.nodeId(), node.processDefinitionKey(), instance.getId());
            return;
        }

        correlate(envelope.messageName(), correlationId, variables);
        log.info("Mensagem Kafka correlacionada: nó {} (processo {}) -> correlationId {}",
                node.nodeId(), node.processDefinitionKey(), correlationId);
    }

    /** Mesma promoção do wf-journey-v1 ({@code ServiceBusResponseListener.buildVariables}):
     * {@code status}/{@code code} viram variáveis de processo de topo, o resto de {@code payload.data}
     * é despejado solto (sem allowlist). */
    private Map<String, Object> buildVariables(EventMessageDTO envelope) {
        Map<String, Object> variables = new HashMap<>();
        PayloadMessageDTO payload = envelope.payload();
        if (payload != null) {
            if (payload.status() != null) {
                variables.put("status", payload.status());
            }
            if (payload.code() != null) {
                variables.put("code", payload.code());
            }
            if (payload.data() != null) {
                variables.putAll(payload.data());
            }
        }
        return variables;
    }

    /** Mesmo fallback do wf-journey-v1 ({@code ServiceBusResponseListener.correlateAndReturn}):
     * tenta por businessKey primeiro, e só cai pro processInstanceId se não achar ninguém esperando
     * por esse businessKey. {@code messageName} pode ser null — o Camunda correlaciona pelo evento
     * que a instância estiver esperando, sem exigir nome. */
    private void correlate(String messageName, String correlationId, Map<String, Object> variables) {
        try {
            runtimeService.createMessageCorrelation(messageName)
                    .processInstanceBusinessKey(correlationId)
                    .setVariables(variables)
                    .correlate();
        } catch (MismatchingMessageCorrelationException e) {
            runtimeService.createMessageCorrelation(messageName)
                    .processInstanceId(correlationId)
                    .setVariables(variables)
                    .correlate();
        }
    }

    private Map<String, Object> resolveOutputMapping(String jsonBody, List<OutputMappingRule> rules) {
        Map<String, Object> variables = new HashMap<>();
        for (OutputMappingRule rule : rules) {
            try {
                Object raw = JsonPath.read(jsonBody, rule.jsonPath());
                variables.put(rule.name(), coerce(raw, rule.type()));
            } catch (PathNotFoundException e) {
                log.warn("Payload Kafka não tem o campo '{}' (regra de mapeamento '{}') — ignorando", rule.jsonPath(), rule.name());
            }
        }
        return variables;
    }

    private Object coerce(Object raw, String type) {
        if (raw == null) {
            return null;
        }
        return switch (type) {
            case "boolean" -> raw instanceof Boolean b ? b : Boolean.parseBoolean(raw.toString());
            case "number" -> raw instanceof Number n ? n.doubleValue() : Double.parseDouble(raw.toString());
            default -> raw.toString();
        };
    }

    private Object parseJsonIfPresent(String json) throws Exception {
        if (json == null || json.isBlank()) {
            return null;
        }
        return objectMapper.readValue(json, Object.class);
    }

    private String asString(Object value) {
        return value != null ? String.valueOf(value) : null;
    }

    private Map<String, String> stringify(Map<String, Object> variables) {
        Map<String, String> result = new LinkedHashMap<>();
        variables.forEach((name, value) -> result.put(name, value != null ? String.valueOf(value) : ""));
        return result;
    }
}
