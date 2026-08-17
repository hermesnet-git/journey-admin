package com.jouney.especregistry.kafka;

import com.jouney.especregistry.adminback.ConnectorConfig;

/** Um nó SERVICE_TASK com conector Kafka (PRODUCE) descoberto numa jornada publicada. */
public record ProducerNode(String nodeId, ConnectorConfig connectorConfig) {
}
