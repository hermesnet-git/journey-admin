package com.jouney.admin.infrastructure.persistence.flow;

import com.jouney.admin.domain.flow.ConnectorConfig;
import com.jouney.admin.domain.flow.ConnectorType;
import com.jouney.admin.domain.flow.FlowNodeType;
import java.util.Map;
import java.util.UUID;

public record FlowNodeRecord(String id, FlowNodeType type, String name, String description, int positionX,
                              int positionY, UUID formId, ConnectorConfigRecord connectorConfig) {

    public record ConnectorConfigRecord(ConnectorType connectorType, Map<String, Object> config,
                                         String credentialRef) {

        public static ConnectorConfigRecord from(ConnectorConfig config) {
            return config == null ? null
                    : new ConnectorConfigRecord(config.getConnectorType(), config.getConfig(), config.getCredentialRef());
        }

        public ConnectorConfig toDomain() {
            return new ConnectorConfig(connectorType, config, credentialRef);
        }
    }
}
