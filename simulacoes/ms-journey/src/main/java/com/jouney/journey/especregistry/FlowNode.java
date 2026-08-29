package com.jouney.journey.especregistry;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import java.util.Map;

/** Recorte do FlowNode do ms-espec-registry — só id/type/name (usados por JourneyStepResolver pra
 * descrever um passo WAITING) e startVariables (usado pra montar a tela de variáveis de início no
 * canal). Sem connectorConfig/position/messageText/embeddedScreenSdui — o canal não desenha
 * diagrama nem mostra detalhe de conector, e a resolução do formulário em si é sempre feita pelo
 * ms-espec-registry (FormSpecController), nunca localmente aqui. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record FlowNode(String id, String type, String name, List<Map<String, Object>> startVariables) {

    public List<Map<String, Object>> startVariables() {
        return startVariables != null ? startVariables : List.of();
    }
}
