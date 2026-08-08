package com.jouney.admin.interfaces.flow;

import com.jouney.admin.domain.flow.ConnectorConfig;
import com.jouney.admin.domain.flow.ConnectorType;
import jakarta.validation.constraints.NotNull;
import java.util.Map;

public record ConnectorConfigInput(@NotNull ConnectorType connectorType, Map<String, Object> config,
                                    String credentialRef) {

    public ConnectorConfig toDomain() {
        return new ConnectorConfig(connectorType, config, credentialRef);
    }
}
