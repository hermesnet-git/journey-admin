package com.jouney.admin.infrastructure.persistence.publication;

import com.jouney.admin.domain.flow.FlowNodeType;
import com.jouney.admin.infrastructure.persistence.flow.FlowNodeRecord;
import java.util.List;
import java.util.Map;

// Forma do nó dentro da snapshot de publicação/versão — diferente do FlowNodeRecord do dia a dia
// do editor (GET/PUT /flow): sem embeddedScreen (a lista crua de campos só importa pra editar),
// com embeddedScreenSdui (a árvore já compilada por FormSduiSerializer, o que o runtime —
// ms-espec-registry — de fato consome pra renderizar a tela de uma User Task).
public record SnapshotFlowNodeRecord(String id, FlowNodeType type, String name, String description, int positionX,
                                      int positionY, FlowNodeRecord.ConnectorConfigRecord connectorConfig,
                                      List<Map<String, Object>> startVariables, String messageText,
                                      List<Object> embeddedScreenSdui) {
}
