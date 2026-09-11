package com.jouney.admin.application.execution;

import com.jouney.admin.domain.execution.EventMessage;
import com.jouney.admin.domain.execution.ExecutionStep;
import com.jouney.admin.domain.execution.KafkaPayload;
import com.jouney.admin.domain.execution.KafkaVariableNames;
import com.jouney.admin.domain.execution.VariableTemplate;
import com.jouney.admin.domain.flow.ConnectorConfig;
import com.jouney.admin.domain.flow.ConnectorType;
import com.jouney.admin.domain.flow.FlowNode;
import com.jouney.admin.domain.flow.FlowNodeType;
import com.jouney.admin.domain.version.JourneyVersion;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

/** Publica de verdade no tópico Kafka do Service Task atual — só aceito quando a instância foi
 * iniciada com controle manual ligado (senão o worker automático já teria completado essa task
 * sozinho, e essa chamada nunca encontraria nada pendente). {@code payloadOverride} ausente pede
 * pro corpo ser resolvido igual ao worker faria; presente é o texto digitado pelo usuário. */
@Service
public class SendKafkaMessage {

    private final RuntimeExecutionPort runtimeExecutionPort;
    private final ExecutionStepResolver stepResolver;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public SendKafkaMessage(RuntimeExecutionPort runtimeExecutionPort, ExecutionStepResolver stepResolver) {
        this.runtimeExecutionPort = runtimeExecutionPort;
        this.stepResolver = stepResolver;
    }

    public ExecutionStep execute(String processInstanceId, Object payloadOverride) {
        ExecutionStep current = stepResolver.resolve(processInstanceId);
        if (!"WAITING".equals(current.type())) {
            throw new IllegalStateException("Instância " + processInstanceId + " não está aguardando um passo não-usuário");
        }
        JourneyVersion version = stepResolver.versionOf(processInstanceId);
        FlowNode node = stepResolver.findNode(version, current.nodeId());
        ConnectorConfig connectorConfig = node.getConnectorConfig();
        if (node.getType() != FlowNodeType.SERVICE_TASK || connectorConfig == null
                || connectorConfig.getConnectorType() != ConnectorType.KAFKA) {
            throw new IllegalStateException("Nó " + node.getId() + " não é um Service Task com conector Kafka");
        }

        Map<String, Object> rawVariables = runtimeExecutionPort.getProcessVariables(processInstanceId);
        if (!Boolean.TRUE.equals(rawVariables.get(KafkaVariableNames.MANUAL_CONTROL))) {
            throw new IllegalStateException("Instância " + processInstanceId
                    + " não foi iniciada com controle manual do Kafka — o worker automático já cuida dela");
        }

        Instant before = Instant.now();
        try {
            Map<String, String> vars = VariableTemplate.stringify(rawVariables);
            Map<String, Object> config = connectorConfig.getConfig() != null ? connectorConfig.getConfig() : Map.of();
            String topic = VariableTemplate.resolve(asString(config.get("topic")), vars);
            if (topic == null || topic.isBlank()) {
                throw new IllegalStateException("Tópico Kafka não configurado");
            }
            Object resolvedPayload = payloadOverride != null ? payloadOverride
                    : KafkaPayload.resolveBusinessPayload(connectorConfig, rawVariables);
            String messageName = rawVariables.get("messageName") instanceof String s ? s : null;
            EventMessage envelope = EventMessage.wrap(processInstanceId, messageName, resolvedPayload);
            String payloadJson = objectMapper.writeValueAsString(envelope);

            Map<String, String> headers = null;
            if (config.get("headers") instanceof Map<?, ?> rawHeaders) {
                headers = new LinkedHashMap<>();
                for (Map.Entry<?, ?> entry : rawHeaders.entrySet()) {
                    headers.put(String.valueOf(entry.getKey()), String.valueOf(VariableTemplate.resolveDeep(entry.getValue(), vars)));
                }
            }
            runtimeExecutionPort.publishKafkaMessage(topic, processInstanceId, payloadJson, headers);

            Map<String, Object> completionVariables = Map.of(
                    KafkaVariableNames.TOPIC_PREFIX + node.getId(), topic,
                    KafkaVariableNames.PAYLOAD_PREFIX + node.getId(), payloadJson);
            runtimeExecutionPort.completeExternalTask(processInstanceId, node.getId(), completionVariables);
        } catch (RuntimeException e) {
            return current.withError(node.getId(), node.getName(), e.getMessage(), connectorConfig);
        }
        return stepResolver.resolve(processInstanceId, before);
    }

    private static String asString(Object value) {
        return value instanceof String s ? s : null;
    }
}
