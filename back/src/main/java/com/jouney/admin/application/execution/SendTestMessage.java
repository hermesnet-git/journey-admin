package com.jouney.admin.application.execution;

import com.jouney.admin.domain.execution.EventMessage;
import com.jouney.admin.domain.flow.ConnectorConfig;
import com.jouney.admin.domain.flow.ConnectorType;
import com.jouney.admin.domain.flow.FlowNode;
import com.jouney.admin.domain.journey.JourneyNotPublishedException;
import com.jouney.admin.domain.publication.Publication;
import com.jouney.admin.domain.publication.PublicationRepository;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

/** Publica de verdade no tópico Kafka configurado num nó — testa o lado de consumo (RECEIVE_TASK/
 * MESSAGE_START_EVENT) sem precisar de um produtor externo real. Envelopa antes de publicar: o
 * worker de consumo (ms-runtime-camunda) exige {@code correlationId} no envelope pra saber a qual
 * instância correlacionar (ou usa como businessKey, se for MESSAGE_START_EVENT) — validar aqui
 * evita a mensagem ser descartada silenciosamente do outro lado. */
@Service
public class SendTestMessage {

    private final PublicationRepository publicationRepository;
    private final RuntimeExecutionPort runtimeExecutionPort;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public SendTestMessage(PublicationRepository publicationRepository, RuntimeExecutionPort runtimeExecutionPort) {
        this.publicationRepository = publicationRepository;
        this.runtimeExecutionPort = runtimeExecutionPort;
    }

    public void execute(UUID journeyId, String nodeId, String correlationId, String messageName, Map<String, Object> data) {
        if (correlationId == null || correlationId.isBlank()) {
            throw new IllegalStateException(
                    "correlationId é obrigatório: é ele que o worker Kafka usa pra correlacionar a mensagem (ou como businessKey, se for MESSAGE_START_EVENT)");
        }
        Publication publication = publicationRepository.findByJourneyId(journeyId)
                .orElseThrow(() -> new JourneyNotPublishedException(journeyId));
        FlowNode node = publication.getFlowNodes().stream()
                .filter(n -> n.getId().equals(nodeId))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Nó " + nodeId + " não encontrado no snapshot da jornada"));
        ConnectorConfig connectorConfig = node.getConnectorConfig();
        if (connectorConfig == null || connectorConfig.getConnectorType() != ConnectorType.KAFKA) {
            throw new IllegalStateException("Nó " + nodeId + " não tem conector Kafka configurado");
        }
        Object topicObj = connectorConfig.getConfig() != null ? connectorConfig.getConfig().get("topic") : null;
        if (!(topicObj instanceof String topicName) || topicName.isBlank()) {
            throw new IllegalStateException("Nó " + nodeId + " não tem tópico Kafka configurado");
        }
        EventMessage envelope = EventMessage.wrap(correlationId, messageName, data);
        String payloadJson = objectMapper.writeValueAsString(envelope);
        runtimeExecutionPort.publishKafkaMessage(topicName, correlationId, payloadJson, null);
    }
}
