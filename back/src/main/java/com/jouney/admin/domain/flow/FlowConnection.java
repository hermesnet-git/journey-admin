package com.jouney.admin.domain.flow;

/**
 * {@code condition}/{@code isDefault} only apply to a connection whose source is a {@code GATEWAY}
 * node (REQ-03.11.002/003): exactly one of a gateway's two outgoing connections is the default
 * (no condition, taken when the other's condition doesn't match); the other carries a condition
 * expression referencing a variable available at that point of the flow (REQ-03.11.004), in the
 * same {@code {{name}}} syntax used by connector fields (REQ-03.09.012). For any other node type
 * both fields stay null/false.
 */
public class FlowConnection {

    private final String id;
    private final String sourceNodeId;
    private final String targetNodeId;
    private final String condition;
    private final boolean isDefault;

    public FlowConnection(String id, String sourceNodeId, String targetNodeId, String condition, boolean isDefault) {
        this.id = id;
        this.sourceNodeId = sourceNodeId;
        this.targetNodeId = targetNodeId;
        this.condition = condition;
        this.isDefault = isDefault;
    }

    public String getId() {
        return id;
    }

    public String getSourceNodeId() {
        return sourceNodeId;
    }

    public String getTargetNodeId() {
        return targetNodeId;
    }

    public String getCondition() {
        return condition;
    }

    public boolean isDefault() {
        return isDefault;
    }
}
