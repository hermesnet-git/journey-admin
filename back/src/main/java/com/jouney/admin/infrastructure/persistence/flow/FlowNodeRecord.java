package com.jouney.admin.infrastructure.persistence.flow;

import com.jouney.admin.domain.flow.ConnectorConfig;
import com.jouney.admin.domain.flow.ConnectorType;
import com.jouney.admin.domain.flow.FlowNodeType;
import com.jouney.admin.infrastructure.persistence.form.FormFieldRecord;
import java.util.List;
import java.util.Map;

// Forma do nó no dia a dia do editor de fluxo (GET/PUT /flow) — embeddedScreen é a lista crua de
// campos, a fonte editável. A árvore SDUI já compilada (embeddedScreenSdui) só existe na snapshot
// de publicação/versão, um formato próprio (ver SnapshotFlowNodeRecord) — não precisa viajar aqui.
public record FlowNodeRecord(String id, FlowNodeType type, String name, String description, int positionX,
                              int positionY, ConnectorConfigRecord connectorConfig,
                              List<Map<String, Object>> startVariables, String messageText,
                              List<FormFieldRecord> embeddedScreen) {

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
