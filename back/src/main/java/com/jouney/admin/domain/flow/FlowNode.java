package com.jouney.admin.domain.flow;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public class FlowNode {

    private final String id;
    private final FlowNodeType type;
    private final String name;
    private final String description;
    private final int positionX;
    private final int positionY;
    private final UUID formId;
    private final ConnectorConfig connectorConfig;
    private final List<Map<String, Object>> startVariables;
    // Only meaningful on a USER_TASK with no formId: a display-only step shows this message
    // instead of a form (may reference {{name}} tokens, same syntax as connector fields/gateway
    // conditions — resolved against the running instance's variables at execution time, not here).
    private final String messageText;

    public FlowNode(String id, FlowNodeType type, String name, String description, int positionX, int positionY,
                     UUID formId, ConnectorConfig connectorConfig, List<Map<String, Object>> startVariables,
                     String messageText) {
        this.id = id;
        this.type = type;
        this.name = name;
        this.description = description;
        this.positionX = positionX;
        this.positionY = positionY;
        this.formId = formId;
        this.connectorConfig = connectorConfig;
        this.startVariables = startVariables;
        this.messageText = messageText;
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

    public UUID getFormId() {
        return formId;
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
}
