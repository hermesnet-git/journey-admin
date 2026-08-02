package com.jouney.admin.domain.flow;

public class FlowConnection {

    private final String id;
    private final String sourceNodeId;
    private final String targetNodeId;

    public FlowConnection(String id, String sourceNodeId, String targetNodeId) {
        this.id = id;
        this.sourceNodeId = sourceNodeId;
        this.targetNodeId = targetNodeId;
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
}
