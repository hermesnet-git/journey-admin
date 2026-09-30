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
    // Raiz da árvore SDUI (catálogo corporativo v1, seção 6) desenhada no editor embutido do nó —
    // null quando a User Task não tem tela desenhada. Sempre um único ui.screen. A mesma árvore vale
    // pro editor ao vivo e pra snapshot publicada (sem compilação/projeção separada como antes:
    // FormSduiSerializer sumiu — o que é editado já é o nó publicável).
    private final SduiNode embeddedScreenRoot;
    // Foto do envelope canônico (tupla Hiccup, seção 14.1) exatamente como foi enviado ao ms-espec-registry na
    // última (re)publicação desta versão — null em qualquer nó do fluxo ao vivo (nunca publicado) ou
    // sem tela. embeddedScreenRoot continua a fonte de verdade pra editar/republicar (ver
    // JourneyVersion.attachPublishedScreens); este campo é só pra "o que está aqui bate com o que
    // saiu", sem precisar recalcular via SduiEnvelopeBuilder pra conferir.
    private final SduiScreenEnvelope sdui;
    // Fontes de dados de referência declaradas pela tela (ADR-002): [{alias, source, params, required,
    // errorMessage}] — viram o dataSources do envelope na publicação, com a configuração da fonte
    // congelada. null/vazio quando a tela não usa fonte.
    private final List<Map<String, Object>> screenDataSources;

    /** Nasce sem sdui — todo nó do fluxo ao vivo (nunca publicado) e qualquer entrada externa
     * (template, geração por IA) usa este construtor. */
    public FlowNode(String id, FlowNodeType type, String name, String description, int positionX, int positionY,
                     ConnectorConfig connectorConfig, List<Map<String, Object>> startVariables,
                     SduiNode embeddedScreenRoot) {
        this(id, type, name, description, positionX, positionY, connectorConfig, startVariables,
                embeddedScreenRoot, null);
    }

    public FlowNode(String id, FlowNodeType type, String name, String description, int positionX, int positionY,
                     ConnectorConfig connectorConfig, List<Map<String, Object>> startVariables,
                     SduiNode embeddedScreenRoot, SduiScreenEnvelope sdui) {
        this(id, type, name, description, positionX, positionY, connectorConfig, startVariables, embeddedScreenRoot,
                sdui, null);
    }

    public FlowNode(String id, FlowNodeType type, String name, String description, int positionX, int positionY,
                     ConnectorConfig connectorConfig, List<Map<String, Object>> startVariables,
                     SduiNode embeddedScreenRoot, SduiScreenEnvelope sdui,
                     List<Map<String, Object>> screenDataSources) {
        this.id = id;
        this.type = type;
        this.name = name;
        this.description = description;
        this.positionX = positionX;
        this.positionY = positionY;
        this.connectorConfig = connectorConfig;
        this.startVariables = startVariables;
        this.embeddedScreenRoot = embeddedScreenRoot;
        this.sdui = sdui;
        this.screenDataSources = screenDataSources;
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

    public SduiNode getEmbeddedScreenRoot() {
        return embeddedScreenRoot;
    }

    public List<Map<String, Object>> getScreenDataSources() {
        return screenDataSources;
    }

    /** Mesmo nó com outra foto de envelope publicado — preserva todo o resto. */
    public FlowNode withSdui(SduiScreenEnvelope newSdui) {
        return new FlowNode(id, type, name, description, positionX, positionY, connectorConfig, startVariables,
                embeddedScreenRoot, newSdui, screenDataSources);
    }

    public SduiScreenEnvelope getSdui() {
        return sdui;
    }
}
