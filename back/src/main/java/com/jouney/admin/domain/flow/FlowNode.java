package com.jouney.admin.domain.flow;

import com.jouney.admin.domain.form.FormField;
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
    // Tela desenhada no editor embutido do próprio nó (dock do canvas de jornada) — lista vazia
    // quando a User Task não tem tela desenhada. Formulários do catálogo servem só como ponto de
    // partida opcional (copiado pra cá na hora de escolher, nunca referenciado por id depois) — não
    // existe amarração em banco entre uma User Task e um Form.
    private final List<FormField> embeddedScreen;
    // Árvore SDUI já compilada (FormSduiSerializer.serialize(embeddedScreen)) — só populada quando
    // este FlowNode vem de uma snapshot de publicação/versão já persistida (Publication/
    // JourneyVersion), onde embeddedScreen não é guardado, só o resultado compilado. Existe
    // separado de embeddedScreen (em vez de recalcular sempre) porque publicar de novo uma
    // JourneyVersion (PublishJourneyVersion) usa os nós reconstruídos dela pra montar a Publication
    // — sem isto, o embeddedScreen vazio faria a recompilação virar null de novo, perdendo a tela.
    private final List<Object> embeddedScreenSdui;

    public FlowNode(String id, FlowNodeType type, String name, String description, int positionX, int positionY,
                     ConnectorConfig connectorConfig, List<Map<String, Object>> startVariables,
                     String messageText, List<FormField> embeddedScreen, List<Object> embeddedScreenSdui) {
        this.id = id;
        this.type = type;
        this.name = name;
        this.description = description;
        this.positionX = positionX;
        this.positionY = positionY;
        this.connectorConfig = connectorConfig;
        this.startVariables = startVariables;
        this.messageText = messageText;
        this.embeddedScreen = embeddedScreen;
        this.embeddedScreenSdui = embeddedScreenSdui;
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

    public List<FormField> getEmbeddedScreen() {
        return embeddedScreen;
    }

    public List<Object> getEmbeddedScreenSdui() {
        return embeddedScreenSdui;
    }
}
