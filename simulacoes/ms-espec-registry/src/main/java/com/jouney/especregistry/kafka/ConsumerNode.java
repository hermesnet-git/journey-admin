package com.jouney.especregistry.kafka;

import com.jouney.especregistry.adminback.ConnectorConfig;
import java.util.UUID;

/** Um nó RECEIVE_TASK ou MESSAGE_START_EVENT com conector Kafka (CONSUME) descoberto numa jornada
 * publicada — {@code journeyId} é o que permite restringir a correlação/início à jornada certa
 * quando o nome da mensagem colide entre jornadas geradas do mesmo template (ver
 * CamundaClient.findProcessInstanceByBusinessKey). */
public record ConsumerNode(UUID journeyId, String nodeId, String nodeType, ConnectorConfig connectorConfig) {
}
