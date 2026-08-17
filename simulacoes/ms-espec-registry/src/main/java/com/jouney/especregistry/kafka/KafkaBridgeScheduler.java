package com.jouney.especregistry.kafka;

import com.jouney.especregistry.adminback.ConnectorConfig;
import com.jouney.especregistry.camunda.CamundaClient;
import com.jouney.especregistry.camunda.CamundaVariable;
import com.jouney.especregistry.camunda.LockedExternalTask;
import com.jouney.especregistry.camunda.ProcessIds;
import com.jouney.especregistry.camunda.ProcessInstanceInfo;
import com.jouney.especregistry.simulation.VariableConversion;
import com.jayway.jsonpath.JsonPath;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import tools.jackson.databind.ObjectMapper;

/**
 * Substitui, dos dois lados, o botão "Simular conclusão" (que fabricava variáveis e
 * completava/correlacionava direto): a cada tick, o lado produtor trava em lote os external tasks
 * Kafka pendentes e publica de verdade; o lado consumidor mantém um KafkaConsumer inscrito nos
 * tópicos de toda RECEIVE_TASK/MESSAGE_START_EVENT publicada e correlaciona/inicia jornada quando
 * uma mensagem real chega — sem clique nenhum dos dois lados. Um único método @Scheduled (não dois)
 * garante que produção e consumo nunca rodem ao mesmo tempo, mesmo que o pool do scheduler mude no
 * futuro — o KafkaConsumer não é thread-safe.
 */
@Component
public class KafkaBridgeScheduler {

    private static final Logger log = LoggerFactory.getLogger(KafkaBridgeScheduler.class);

    private final KafkaTopicDiscovery topicDiscovery;
    private final CamundaClient camundaClient;
    private final VariableTemplateResolver resolver;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final KafkaConsumer<String, String> kafkaConsumer;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private Set<String> subscribedTopics = Set.of();

    public KafkaBridgeScheduler(KafkaTopicDiscovery topicDiscovery, CamundaClient camundaClient,
                                 VariableTemplateResolver resolver, KafkaTemplate<String, String> kafkaTemplate,
                                 KafkaConsumer<String, String> kafkaConsumer) {
        this.topicDiscovery = topicDiscovery;
        this.camundaClient = camundaClient;
        this.resolver = resolver;
        this.kafkaTemplate = kafkaTemplate;
        this.kafkaConsumer = kafkaConsumer;
    }

    @Scheduled(fixedDelay = 3000)
    public void tick() {
        produceTick();
        consumeTick();
    }

    private void produceTick() {
        Map<String, ProducerNode> byExternalTaskTopic;
        try {
            byExternalTaskTopic = topicDiscovery.discoverProducerNodes();
        } catch (RestClientException e) {
            log.warn("Falha ao descobrir nós produtores Kafka (admin/back fora do ar?): {}", e.getMessage());
            return;
        }
        if (byExternalTaskTopic.isEmpty()) {
            return;
        }

        List<LockedExternalTask> locked;
        try {
            locked = camundaClient.fetchAndLockAll(byExternalTaskTopic.keySet());
        } catch (RestClientException e) {
            log.warn("Falha ao travar external tasks Kafka pendentes (Camunda fora do ar?): {}", e.getMessage());
            return;
        }

        for (LockedExternalTask task : locked) {
            ProducerNode node = byExternalTaskTopic.get(task.topicName());
            if (node == null) {
                continue;
            }
            try {
                produce(task, node);
                camundaClient.completeExternalTaskById(task.id(), Map.of());
            } catch (Exception e) {
                // Deixa a task travada — expira o lock (30s) e volta a ser pega no próximo tick.
                log.error("Falha ao publicar mensagem Kafka pro nó {} (instância {}): {}",
                        node.nodeId(), task.processInstanceId(), e.getMessage(), e);
            }
        }
    }

    private void produce(LockedExternalTask task, ProducerNode node) throws Exception {
        Map<String, String> vars = stringify(camundaClient.getProcessVariables(task.processInstanceId()));
        ConnectorConfig connectorConfig = node.connectorConfig();
        Map<String, Object> config = connectorConfig.config() != null ? connectorConfig.config() : Map.of();

        String topic = resolver.resolve(asString(config.get("topic")), vars);
        if (topic == null || topic.isBlank()) {
            throw new IllegalStateException("Nó " + node.nodeId() + " não tem tópico Kafka configurado");
        }
        Object resolvedPayload = resolver.resolveDeep(config.get("payload"), vars);
        String payloadJson = objectMapper.writeValueAsString(resolvedPayload);

        ProducerRecord<String, String> record = new ProducerRecord<>(topic, task.processInstanceId(), payloadJson);
        if (config.get("headers") instanceof Map<?, ?> headers) {
            headers.forEach((key, value) -> {
                Object resolvedValue = resolver.resolveDeep(value, vars);
                record.headers().add(String.valueOf(key), String.valueOf(resolvedValue).getBytes(StandardCharsets.UTF_8));
            });
        }

        kafkaTemplate.send(record).get(5, TimeUnit.SECONDS);
        log.info("Publicado no tópico Kafka '{}' (nó {}, instância {})", topic, node.nodeId(), task.processInstanceId());
    }

    private String asString(Object value) {
        return value instanceof String s ? s : null;
    }

    private Map<String, String> stringify(Map<String, CamundaVariable> variables) {
        Map<String, String> result = new LinkedHashMap<>();
        variables.forEach((name, variable) -> result.put(name, variable.value() != null ? String.valueOf(variable.value()) : ""));
        return result;
    }

    private void consumeTick() {
        Map<String, List<ConsumerNode>> byTopic;
        try {
            byTopic = topicDiscovery.discoverConsumerNodes();
        } catch (RestClientException e) {
            log.warn("Falha ao descobrir nós consumidores Kafka (admin/back fora do ar?): {}", e.getMessage());
            return;
        }

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
                    log.error("Falha ao processar mensagem Kafka do tópico '{}' pro nó {} (jornada {}): {}",
                            record.topic(), node.nodeId(), node.journeyId(), e.getMessage(), e);
                }
            }
        }
    }

    private void consume(String jsonBody, ConsumerNode node) {
        String processDefinitionKey = ProcessIds.keyForJourney(node.journeyId());
        Map<String, CamundaVariable> variables = VariableConversion.resolveOutputMapping(jsonBody, node.connectorConfig());

        if ("MESSAGE_START_EVENT".equals(node.nodeType())) {
            // Inicia direto pela definição de processo já conhecida, sem passar pelo /message do
            // Camunda: o nome da mensagem ("Message_"+nodeId) pode colidir entre jornadas geradas do
            // mesmo template (ver ConsumerNode), então correlacionar por nome arriscaria iniciar a
            // jornada errada. Aqui não tem ambiguidade — já sabemos exatamente qual jornada é.
            String businessKey = extractBusinessKey(jsonBody).orElse(UUID.randomUUID().toString());
            String processInstanceId = camundaClient.startProcessInstance(processDefinitionKey, variables, businessKey);
            log.info("Jornada iniciada por mensagem Kafka: nó {} (jornada {}) -> instância {}",
                    node.nodeId(), node.journeyId(), processInstanceId);
            return;
        }

        // RECEIVE_TASK: resolve businessKey -> processInstanceId exato, já restrito a esta jornada,
        // antes de correlacionar — mesmo motivo do caso acima, businessKey é o que desambigua.
        Optional<String> businessKey = extractBusinessKey(jsonBody);
        if (businessKey.isEmpty()) {
            log.warn("Mensagem Kafka pro nó {} (jornada {}) não tem 'businessKey' no corpo — não há como saber a qual instância correlacionar", node.nodeId(), node.journeyId());
            return;
        }
        Optional<ProcessInstanceInfo> instance = camundaClient.findProcessInstanceByBusinessKey(businessKey.get(), processDefinitionKey);
        if (instance.isEmpty()) {
            log.warn("Nenhuma instância da jornada {} com businessKey '{}' esperando — mensagem ignorada", node.journeyId(), businessKey.get());
            return;
        }
        camundaClient.correlateMessage("Message_" + node.nodeId(), instance.get().id(), variables);
        log.info("Mensagem Kafka correlacionada: nó {} (jornada {}) -> instância {}", node.nodeId(), node.journeyId(), instance.get().id());
    }

    private Optional<String> extractBusinessKey(String jsonBody) {
        try {
            Object value = JsonPath.read(jsonBody, "$.businessKey");
            return value instanceof String s && !s.isBlank() ? Optional.of(s) : Optional.empty();
        } catch (Exception e) {
            return Optional.empty();
        }
    }
}
