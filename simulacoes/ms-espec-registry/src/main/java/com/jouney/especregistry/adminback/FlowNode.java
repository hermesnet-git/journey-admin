package com.jouney.especregistry.adminback;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import java.util.Map;

/** {@code embeddedScreenSdui} é a árvore hyperscript [tag, props, children] gerada por
 * FormSduiSerializer no admin/back a partir da tela desenhada no editor embutido do nó — repassada
 * ao simulador tal como está, sem reinterpretação. Ausente/vazia quando a User Task não tem tela
 * desenhada (passo somente-mensagem, ver messageText). */
@JsonIgnoreProperties(ignoreUnknown = true)
public record FlowNode(String id, String type, String name, int positionX, int positionY,
                        ConnectorConfig connectorConfig, List<Map<String, Object>> startVariables,
                        String messageText, List<Object> embeddedScreenSdui) {

    /** REQ-03.12.001: {name, type} declarações no nó START — nunca null no uso, mesmo que o JSON não traga o campo. */
    public List<Map<String, Object>> startVariables() {
        return startVariables != null ? startVariables : List.of();
    }
}
