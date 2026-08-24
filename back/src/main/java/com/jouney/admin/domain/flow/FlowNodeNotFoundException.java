package com.jouney.admin.domain.flow;

public class FlowNodeNotFoundException extends RuntimeException {

    public FlowNodeNotFoundException(String nodeId) {
        super("Flow node not found: " + nodeId);
    }
}
