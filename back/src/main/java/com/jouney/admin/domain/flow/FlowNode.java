package com.jouney.admin.domain.flow;

import com.jouney.admin.domain.sdui.SduiNode;
import java.util.List;
import java.util.Map;

public class FlowNode {

    private final String id;
    private final FlowNodeType type;
    private final String name;
    private final String description;
    private final int positionX;
    private final int positionY;
    private final ConnectorConfig connectorConfig;
    private final List<Map<String, Object>> startVariables;
    // Only meaningful on a USER_TASK with no tela desenhada: a display-only step shows this message
    // instead of a form (may reference {{name}} tokens, same syntax as connector fields/gateway
    // conditions — resolved against the running instance's variables at execution time, not here).
    private final String messageText;
    // Raiz da árvore SDUI (catálogo corporativo v1, seção 6) desenhada no editor embutido do nó —
    // null quando a User Task não tem tela desenhada. Sempre um único ui.screen. A mesma árvore vale
    // pro editor ao vivo e pra snapshot publicada (sem compilação/projeção separada como antes:
    // FormSduiSerializer sumiu — o que é editado já é o nó publicável).
    private final SduiNode embeddedScreenRoot;
    // Foto do envelope canônico (tupla Hiccup, seção 14.1) exatamente como foi enviado ao Strapi na
    // última (re)publicação desta versão — null em qualquer nó do fluxo ao vivo (nunca publicado) ou
    // sem tela. embeddedScreenRoot continua a fonte de verdade pra editar/republicar (ver
    // JourneyVersion.attachPublishedScreens); este campo é só pra "o que está aqui bate com o que
    // saiu", sem precisar recalcular via SduiEnvelopeBuilder pra conferir.
    private final SduiScreenEnvelope sdui;

    /** Nasce sem sdui — todo nó do fluxo ao vivo (nunca publicado) e qualquer entrada externa
     * (template, geração por IA) usa este construtor. */
    public FlowNode(String id, FlowNodeType type, String name, String description, int positionX, int positionY,
                     ConnectorConfig connectorConfig, List<Map<String, Object>> startVariables,
                     String messageText, SduiNode embeddedScreenRoot) {
        this(id, type, name, description, positionX, positionY, connectorConfig, startVariables, messageText,
                embeddedScreenRoot, null);
    }

    public FlowNode(String id, FlowNodeType type, String name, String description, int positionX, int positionY,
                     ConnectorConfig connectorConfig, List<Map<String, Object>> startVariables,
                     String messageText, SduiNode embeddedScreenRoot, SduiScreenEnvelope sdui) {
        this.id = id;
        this.type = type;
        this.name = name;
        this.description = description;
        this.positionX = positionX;
        this.positionY = positionY;
        this.connectorConfig = connectorConfig;
        this.startVariables = startVariables;
        this.messageText = messageText;
        this.embeddedScreenRoot = embeddedScreenRoot;
        this.sdui = sdui;
    }

    public String getId() {
        return id;
    }

    public FlowNodeType getType() {
        return type;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public int getPositionX() {
        return positionX;
    }

    public int getPositionY() {
        return positionY;
    }

    public ConnectorConfig getConnectorConfig() {
        return connectorConfig;
    }

    public List<Map<String, Object>> getStartVariables() {
        return startVariables;
    }

    public String getMessageText() {
        return messageText;
    }

    public SduiNode getEmbeddedScreenRoot() {
        return embeddedScreenRoot;
    }

    public SduiScreenEnvelope getSdui() {
        return sdui;
    }
}
