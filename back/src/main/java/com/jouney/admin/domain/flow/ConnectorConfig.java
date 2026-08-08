package com.jouney.admin.domain.flow;

import java.util.Map;

/**
 * Declarative, extensible connector configuration attached to SERVICE_TASK,
 * RECEIVE_TASK and MESSAGE_START_EVENT nodes (FT-03.08/FT-03.09). {@code config}
 * holds the connector-specific shape (REST: method/url/headers/params/body/
 * mappings; Kafka: topic/operation/headers/payload/mappings) as a free-form
 * map so new connector types don't require new persistence structures.
 * {@code credentialRef} points to a credential stored elsewhere; no secret is
 * ever held here (REQ-03.09.005).
 */
public class ConnectorConfig {

    private final ConnectorType connectorType;
    private final Map<String, Object> config;
    private final String credentialRef;

    public ConnectorConfig(ConnectorType connectorType, Map<String, Object> config, String credentialRef) {
        this.connectorType = connectorType;
        this.config = config;
        this.credentialRef = credentialRef;
    }

    public ConnectorType getConnectorType() {
        return connectorType;
    }

    public Map<String, Object> getConfig() {
        return config;
    }

    public String getCredentialRef() {
        return credentialRef;
    }
}
