package com.jouney.admin.infrastructure.persistence.flow;

import com.jouney.admin.domain.flow.ConnectorConfig;
import com.jouney.admin.domain.flow.ConnectorType;
import com.jouney.admin.domain.flow.FlowNodeType;
import com.jouney.admin.domain.sdui.SduiNode;
import java.util.List;
import java.util.Map;

// Forma do nó tanto no editor de fluxo ao vivo (GET/PUT /flow) quanto na snapshot de publicação/
// versão — desde que embeddedScreenRoot deixou de ter uma projeção compilada separada
// (FormSduiSerializer removido), as duas formas colapsaram numa só (antes: FlowNodeRecord com
// embeddedScreen cru vs. SnapshotFlowNodeRecord com embeddedScreenSdui compilado).
public record FlowNodeRecord(String id, FlowNodeType type, String name, String description, int positionX,
                              int positionY, ConnectorConfigRecord connectorConfig,
                              List<Map<String, Object>> startVariables, String messageText,
                              SduiNode embeddedScreenRoot) {

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
