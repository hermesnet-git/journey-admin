package com.jouney.especregistry.kafka;

import com.jouney.especregistry.adminback.ConnectorConfig;
import com.jouney.especregistry.camunda.CamundaVariable;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

/**
 * Publica de verdade no tópico Kafka configurado num SERVICE_TASK — única implementação de "como
 * publicar" (resolve {{variável}}, monta headers, envia), reaproveitada tanto pelo worker automático
 * ({@link KafkaBridgeScheduler}) quanto pelo envio sob demanda/manual a partir da tela de Execução
 * (SimulationController), pra nunca ter duas lógicas divergentes de resolução de tópico/payload.
 */
@Component
public class KafkaMessagePublisher {

    /** Variável de processo que, quando true, tira um Service Task Kafka do piloto automático do
     * {@link KafkaBridgeScheduler} — setada por SimulationController.start() quando o usuário liga o
     * controle manual ao iniciar a execução de teste (ver SimulationController.sendKafkaMessage). */
    public static final String MANUAL_KAFKA_CONTROL_VAR = "__kafkaManualControl__";

    // Registrado como variável de PROCESSO (não local) na hora de completar a task, de propósito: o
    // worker completa de forma assíncrona (fetchAndLock/complete, sem transação compartilhada com
    // quem depois monta a trilha do log em SimulationController.trailSince), então precisa sobreviver
    // além do escopo da própria atividade — diferente do conector REST (HttpConnectorDelegate, em
    // ms-runtime-camunda, roda síncrono na mesma transação e grava local, sem precisar de prefixo
    // reservado). Nunca usado por lógica de negócio, só pra aparecer na trilha do log de execução.
    public static final String KAFKA_TOPIC_VAR_PREFIX = "__kafkaTopic__";
    public static final String KAFKA_PAYLOAD_VAR_PREFIX = "__kafkaPayload__";

    private final VariableTemplateResolver resolver;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public KafkaMessagePublisher(VariableTemplateResolver resolver, KafkaTemplate<String, String> kafkaTemplate) {
        this.resolver = resolver;
        this.kafkaTemplate = kafkaTemplate;
    }

    /** Resolve só o payload (sem publicar) — usado pra pré-preencher o editor manual da tela de
     * Execução com o mesmo corpo que o worker automático enviaria, em vez de abrir em branco e
     * exigir que o usuário escreva JSON do zero de memória. */
    public Object resolvePayload(ConnectorConfig connectorConfig, Map<String, CamundaVariable> rawVariables) {
        Map<String, String> vars = stringify(rawVariables);
        Map<String, Object> config = connectorConfig.config() != null ? connectorConfig.config() : Map.of();
        return resolver.resolveDeep(config.get("payload"), vars);
    }

    /** @param payloadOverride quando não-nulo, substitui o payload declarado no nó — é o que permite
     * o usuário digitar a mensagem em vez de deixar {@code config.payload} do nó ser resolvido.
     * @return o tópico e o payload de fato enviados, pra quem chamou gravar como variável de
     * processo (ver {@link #completionVariables}) e assim aparecer na trilha do log. */
    public PublishedKafkaMessage publish(String key, ConnectorConfig connectorConfig, Map<String, CamundaVariable> rawVariables,
                                          Object payloadOverride) throws Exception {
        Map<String, String> vars = stringify(rawVariables);
        Map<String, Object> config = connectorConfig.config() != null ? connectorConfig.config() : Map.of();
        String topic = resolver.resolve(asString(config.get("topic")), vars);
        if (topic == null || topic.isBlank()) {
            throw new IllegalStateException("Tópico Kafka não configurado");
        }
        Object resolvedPayload = payloadOverride != null ? payloadOverride : resolver.resolveDeep(config.get("payload"), vars);
        String payloadJson = objectMapper.writeValueAsString(resolvedPayload);

        ProducerRecord<String, String> record = new ProducerRecord<>(topic, key, payloadJson);
        if (config.get("headers") instanceof Map<?, ?> headers) {
            headers.forEach((k, v) -> {
                Object resolvedValue = resolver.resolveDeep(v, vars);
                record.headers().add(String.valueOf(k), String.valueOf(resolvedValue).getBytes(StandardCharsets.UTF_8));
            });
        }
        kafkaTemplate.send(record).get(5, TimeUnit.SECONDS);
        return new PublishedKafkaMessage(topic, payloadJson);
    }

    /** Variáveis a passar no complete do external task pra essa publicação aparecer na trilha do log
     * de execução (SimulationController.trailSince) — ver comentário de KAFKA_TOPIC_VAR_PREFIX acima
     * pro motivo de precisar ser variável de processo (não local). */
    public Map<String, CamundaVariable> completionVariables(String nodeId, PublishedKafkaMessage published) {
        return Map.of(
                KAFKA_TOPIC_VAR_PREFIX + nodeId, new CamundaVariable(published.topic(), "String"),
                KAFKA_PAYLOAD_VAR_PREFIX + nodeId, new CamundaVariable(published.payloadJson(), "String"));
    }

    private String asString(Object value) {
        return value instanceof String s ? s : null;
    }

    private Map<String, String> stringify(Map<String, CamundaVariable> variables) {
        Map<String, String> result = new LinkedHashMap<>();
        variables.forEach((name, variable) -> result.put(name, variable.value() != null ? String.valueOf(variable.value()) : ""));
        return result;
    }
}
