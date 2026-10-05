package com.jouney.runtimecamunda.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jayway.jsonpath.JsonPath;
import com.jouney.runtimecamunda.delegate.ListOutput;
import com.jayway.jsonpath.PathNotFoundException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.clients.consumer.OffsetAndMetadata;
import org.apache.kafka.common.TopicPartition;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.errors.AuthenticationException;
import org.apache.kafka.common.errors.AuthorizationException;
import org.apache.kafka.common.errors.InvalidTopicException;
import org.apache.kafka.common.errors.RecordTooLargeException;
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

    /** Mesmo código que BpmnTransformer (ms-transform-publication) e HttpConnectorDelegate usam no evento de
     * erro preso à tarefa — a saída "Se falhar" desenhada no editor. */
    static final String INTEGRATION_FAILED_ERROR_CODE = "INTEGRACAO_FALHOU";

    // Resiliência do envio (passo "Resiliência" do conector de mensageria). Padrões e tetos; valores fora da faixa
    // já são barrados pelo FlowValidator (admin) e o teto é reaplicado aqui só por segurança.
    private static final int DEFAULT_SEND_MS = 5_000;
    private static final int MAX_SEND_MS = 10_000;
    private static final int DEFAULT_RETRIES = 2;
    private static final int MAX_RETRIES = 2;
    private static final int DEFAULT_RETRY_INTERVAL_MS = 2_000;
    private static final int MAX_RETRY_INTERVAL_MS = 5_000;

    private final ExternalTaskService externalTaskService;
    private final RuntimeService runtimeService;
    private final KafkaConsumerNodeDiscovery consumerNodeDiscovery;
    private final VariableTemplateResolver templateResolver;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final KafkaConsumer<String, String> kafkaConsumer;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ExecutorService sendExecutor = Executors.newCachedThreadPool();

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
            fetchBuilder = fetchBuilder.topic(topic, 30000).variables("topic", "payload", "payloadMode", "headers", "sendTimeoutMs", "retries", "retryIntervalMs", "hasErrorPath");
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
                handleSendFailure(task, e);
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
            // Collectors.toMap não aceita valor null (usa HashMap.merge por baixo, que lança NPE mesmo
            // sem colisão) — uma variável de processo null (ex: campo não resolvido de um 404 de
            // negócio) é caso normal aqui, não pode quebrar a publicação.
            Map<String, Object> dump = new LinkedHashMap<>();
            processVariables.forEach((key, value) -> {
                if (!key.startsWith("__")) {
                    dump.put(key, value);
                }
            });
            resolvedPayload = dump;
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
        // O envio roda em outra thread só para o tempo limite da etapa valer também enquanto o cliente espera os
        // metadados do broker (send() bloqueia até max.block.ms antes de devolver o futuro).
        CompletableFuture.supplyAsync(() -> kafkaTemplate.send(record), sendExecutor)
                .thenCompose(future -> future)
                .get(intVariable(task, "sendTimeoutMs", DEFAULT_SEND_MS, MAX_SEND_MS, 1_000), TimeUnit.MILLISECONDS);

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

    /**
     * Falha ao publicar. Só falha passageira (sem conexão com o broker, tempo esgotado) é repetida, até o número de
     * novas tentativas da etapa, com espera crescente; erro definitivo (tópico em branco ou inválido, credencial ou
     * permissão recusada, mensagem grande demais) não se repete. Esgotado, a falha vai pela saída "Se falhar" quando a
     * etapa tem uma; senão a tarefa externa falha de vez e vira incidente (o Diagnóstico oferece "Tentar de novo").
     */
    private void handleSendFailure(LockedExternalTask task, Exception failure) {
        Throwable cause = failure instanceof ExecutionException && failure.getCause() != null ? failure.getCause() : failure;
        String message = describeFailure(task, cause);
        int configured = intVariable(task, "retries", DEFAULT_RETRIES, MAX_RETRIES, 0);
        int remaining = task.getRetries() == null ? configured : task.getRetries() - 1;
        boolean definitive = isDefinitive(cause) || remaining <= 0;
        log.error("Falha ao publicar mensagem Kafka pro nó {} (instância {}), {}: {}", task.getActivityId(),
                task.getProcessInstanceId(), definitive ? "definitiva" : "nova tentativa em breve", message, failure);
        try {
            if (!definitive) {
                int attempt = configured - remaining;
                long interval = intVariable(task, "retryIntervalMs", DEFAULT_RETRY_INTERVAL_MS, MAX_RETRY_INTERVAL_MS, 0) * (1L << attempt);
                long jitter = interval == 0 ? 0 : ThreadLocalRandom.current().nextLong(interval / 5 + 1);
                externalTaskService.handleFailure(task.getId(), WORKER_ID, message, null, remaining, Math.min(interval + jitter, 10_000L));
            } else if (Boolean.parseBoolean(asString(task.getVariables().get("hasErrorPath")))) {
                externalTaskService.handleBpmnError(task.getId(), WORKER_ID, INTEGRATION_FAILED_ERROR_CODE, message);
            } else {
                externalTaskService.handleFailure(task.getId(), WORKER_ID, message, null, 0, 0);
            }
        } catch (Exception e) {
            // Sem conseguir registrar a falha, deixa a tarefa travada: o bloqueio expira (30 s) e ela volta no próximo ciclo.
            log.error("Não foi possível registrar a falha do nó {} (instância {}): {}", task.getActivityId(), task.getProcessInstanceId(), e.getMessage(), e);
        }
    }

    private static boolean has(Throwable cause, Class<? extends Throwable> type) {
        for (Throwable t = cause; t != null; t = t.getCause() == t ? null : t.getCause()) {
            if (type.isInstance(t)) {
                return true;
            }
        }
        return false;
    }

    // O KafkaTemplate embrulha o erro real do cliente ("Send failed"), então a causa é procurada em toda a cadeia.
    private static boolean isDefinitive(Throwable cause) {
        return has(cause, IllegalStateException.class)
                || has(cause, AuthorizationException.class)
                || has(cause, AuthenticationException.class)
                || has(cause, InvalidTopicException.class)
                || has(cause, RecordTooLargeException.class);
    }

    /** Motivo legível para o Diagnóstico e o log da execução: o que falhou e em qual tópico, sem detalhe técnico do cliente. */
    private String describeFailure(LockedExternalTask task, Throwable cause) {
        String topic = asString(task.getVariables().get("topic"));
        String where = topic == null || topic.isBlank() ? "" : " no tópico " + topic;
        if (cause instanceof IllegalStateException) {
            return cause.getMessage();
        }
        if (has(cause, AuthorizationException.class) || has(cause, AuthenticationException.class)) {
            return "O broker recusou a credencial ou a permissão para publicar" + where;
        }
        if (has(cause, InvalidTopicException.class)) {
            return "Nome de tópico inválido" + (topic == null || topic.isBlank() ? "" : ": " + topic);
        }
        if (has(cause, RecordTooLargeException.class)) {
            return "A mensagem é grande demais para publicar" + where;
        }
        if (has(cause, java.util.concurrent.TimeoutException.class) || has(cause, org.apache.kafka.common.errors.TimeoutException.class)) {
            return "Sem resposta do broker no tempo limite ao publicar" + where;
        }
        return "Não foi possível publicar" + where + ": " + (cause.getMessage() != null ? cause.getMessage() : cause.getClass().getSimpleName());
    }

    private int intVariable(LockedExternalTask task, String name, int fallback, int max, int min) {
        Object value = task.getVariables().get(name);
        if (value == null) {
            return fallback;
        }
        try {
            int parsed = (int) Double.parseDouble(String.valueOf(value).replace("\"", "").trim());
            return Math.max(min, Math.min(parsed, max));
        } catch (NumberFormatException e) {
            return fallback;
        }
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
        // O offset de uma partição só avança até a última mensagem tratada. Falha passageira (ex.: banco do motor
        // indisponível) volta a mensagem para a próxima rodada, até MAX_PROCESSING_ATTEMPTS vezes.
        Map<TopicPartition, OffsetAndMetadata> processed = new HashMap<>();
        Set<TopicPartition> blocked = new java.util.HashSet<>();
        for (ConsumerRecord<String, String> record : records) {
            TopicPartition partition = new TopicPartition(record.topic(), record.partition());
            if (blocked.contains(partition)) {
                continue;
            }
            boolean handled = true;
            for (ConsumerNode node : byTopic.getOrDefault(record.topic(), List.of())) {
                try {
                    consume(record.value(), node);
                } catch (MismatchingMessageCorrelationException e) {
                    // Mensagem de outro assunto, de instância que já terminou ou que ainda não espera: descartar é normal.
                    log.info("Mensagem Kafka do tópico '{}' descartada: nenhuma instância de {} está esperando por ela (correlationId do envelope)",
                            record.topic(), node.processDefinitionKey());
                } catch (Exception e) {
                    if (shouldRetry(partition, record.offset(), node, e)) {
                        handled = false;
                        break;
                    }
                }
            }
            if (handled) {
                processed.put(partition, new OffsetAndMetadata(record.offset() + 1));
            } else {
                blocked.add(partition);
                kafkaConsumer.seek(partition, record.offset());
            }
        }
        if (!processed.isEmpty()) {
            kafkaConsumer.commitSync(processed);
        }
    }

    private static final int MAX_PROCESSING_ATTEMPTS = 3;
    private final Map<String, Integer> processingAttempts = new HashMap<>();

    /** Conta a tentativa; {@code true} enquanto ainda vale repetir, {@code false} quando desiste e a mensagem é descartada. */
    private boolean shouldRetry(TopicPartition partition, long offset, ConsumerNode node, Exception failure) {
        String key = partition + "@" + offset;
        int attempt = processingAttempts.merge(key, 1, Integer::sum);
        if (attempt >= MAX_PROCESSING_ATTEMPTS) {
            processingAttempts.remove(key);
            log.error("Desistindo da mensagem Kafka do tópico '{}' (offset {}) pro nó {} (processo {}) depois de {} tentativas: {}",
                    partition.topic(), offset, node.nodeId(), node.processDefinitionKey(), attempt, failure.getMessage(), failure);
            return false;
        }
        log.warn("Falha ao processar mensagem Kafka do tópico '{}' (offset {}) pro nó {} (processo {}), tentativa {} de {}: {}",
                partition.topic(), offset, node.nodeId(), node.processDefinitionKey(), attempt, MAX_PROCESSING_ATTEMPTS, failure.getMessage());
        return true;
    }

    private void consume(String jsonBody, ConsumerNode node) {
        EventMessageDTO envelope;
        try {
            envelope = objectMapper.readValue(jsonBody, EventMessageDTO.class);
        } catch (Exception e) {
            log.info("Mensagem Kafka pro nó {} (processo {}) descartada, não é um EventMessageDTO válido — a espera continua: {}",
                    node.nodeId(), node.processDefinitionKey(), e.getMessage());
            return;
        }
        String correlationId = envelope.correlationId();
        if (correlationId == null || correlationId.isBlank()) {
            log.info("Mensagem Kafka pro nó {} (processo {}) descartada, sem 'correlationId' — a espera continua",
                    node.nodeId(), node.processDefinitionKey());
            return;
        }

        Map<String, Object> variables = buildVariables(envelope);
        variables.putAll(resolveOutputMapping(jsonBody, node.outputMapping()));
        // Mesmas variáveis reservadas que publishAndComplete grava pro lado produtor — sem isso, a
        // trilha de execução/histórico do admin (InstanceHistoryController.kafkaInput) não tinha de
        // onde ler a mensagem recebida por este nó, só os campos já espalhados soltos acima.
        variables.put(KAFKA_TOPIC_VAR_PREFIX + node.nodeId(), node.topic());
        variables.put(KAFKA_PAYLOAD_VAR_PREFIX + node.nodeId(), jsonBody);

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
     * é despejado solto (sem allowlist). Grava direto via API do motor (startProcessInstanceByKey/
     * correlate, mais abaixo) — não passa pelo camunda:outputParameter que BpmnTransformer declara
     * pra Service Task, então precisa prefixar "data_" aqui na mão (mesma convenção de qualquer
     * variável de origem de integração, ver BindingResolver/VariableConversion). */
    private Map<String, Object> buildVariables(EventMessageDTO envelope) {
        Map<String, Object> variables = new HashMap<>();
        PayloadMessageDTO payload = envelope.payload();
        if (payload != null) {
            if (payload.status() != null) {
                putWithNamespaceFallback(variables, "status", payload.status());
            }
            if (payload.code() != null) {
                putWithNamespaceFallback(variables, "code", payload.code());
            }
            if (payload.data() != null) {
                // Lista/objeto vira variável JSON do motor (não objeto Java cru, binário e ilegível no
                // Diagnóstico) — sem filtro de campos: quem precisa filtrar declara uma regra "list".
                payload.data().forEach((name, value) -> putWithNamespaceFallback(variables, name, asEngineValue(value)));
            }
        }
        return variables;
    }

    // ponytail: fallback de transição — enquanto nem toda jornada publicada antes do ajuste de
    // namespace foi republicada, o mesmo worker consome tópicos de jornadas antigas (esperam nome
    // cru) e novas (esperam "data_<nome>") ao mesmo tempo. Grava as duas formas; se o nome já vier
    // com namespace (uma regra de outputMapping já declarada como "data_x", por exemplo), respeita
    // como está e grava uma vez só. Remover quando não houver mais jornada antiga rodando.
    private void putWithNamespaceFallback(Map<String, Object> variables, String name, Object value) {
        if (name.startsWith("data_") || name.startsWith("form_")) {
            variables.put(name, value);
        } else {
            variables.put("data_" + name, value);
            variables.put(name, value);
        }
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

    // Mesmo motivo do buildVariables acima: grava direto via API, sem passar pelo outputParameter
    // declarativo — precisa do mesmo fallback de namespace (putWithNamespaceFallback).
    private Map<String, Object> resolveOutputMapping(String jsonBody, List<OutputMappingRule> rules) {
        Map<String, Object> variables = new HashMap<>();
        for (OutputMappingRule rule : rules) {
            try {
                Object raw = JsonPath.read(jsonBody, rule.jsonPath());
                putWithNamespaceFallback(variables, rule.name(), "list".equals(rule.type())
                        ? ListOutput.toSpin(raw, rule.keepFields())
                        : coerce(raw, rule.type()));
            } catch (PathNotFoundException e) {
                log.warn("Payload Kafka não tem o campo '{}' (regra de mapeamento '{}') — ignorando", rule.jsonPath(), rule.name());
            }
        }
        return variables;
    }

    private Object asEngineValue(Object value) {
        if (value instanceof List<?>) {
            return ListOutput.toSpin(value, List.of());
        }
        if (value instanceof Map<?, ?>) {
            try {
                return org.camunda.spin.Spin.JSON(objectMapper.writeValueAsString(value));
            } catch (Exception e) {
                throw new IllegalStateException("Não foi possível converter o objeto em JSON", e);
            }
        }
        return value;
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
