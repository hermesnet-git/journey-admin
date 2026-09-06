package com.jouney.especregistry.adminback;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import tools.jackson.databind.JsonNode;
import java.util.List;
import java.util.Map;

/** {@code embeddedScreenRoot} chega aqui só como sinalizador de "esta User Task tem tela desenhada"
 * (JsonNode genérico, nunca desserializado pra SduiNode tipado) — a árvore de tela EM SI não vem
 * mais do admin/back pra este serviço: depois de publicada, ela é lida do Strapi via
 * SnapshotRepository (journeyId+screenId=node.id()), a fonte de verdade dos snapshots publicados
 * (seção 4/15 do catálogo). O admin/back continua sendo a fonte pro resto do fluxo (mensagens,
 * conectores, gateways) — fora do escopo do catálogo SDUI. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record FlowNode(String id, String type, String name, int positionX, int positionY,
                        ConnectorConfig connectorConfig, List<Map<String, Object>> startVariables,
                        String messageText, JsonNode embeddedScreenRoot) {

    /** REQ-03.12.001: {name, type} declarações no nó START — nunca null no uso, mesmo que o JSON não traga o campo. */
    public List<Map<String, Object>> startVariables() {
        return startVariables != null ? startVariables : List.of();
    }

    public boolean hasEmbeddedScreen() {
        return embeddedScreenRoot != null && !embeddedScreenRoot.isNull();
    }
}
