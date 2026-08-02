package com.jouney.admin.domain.flow;

import java.util.UUID;

/**
 * BPMN XML ids must be a valid NCName (cannot start with a digit), which a bare
 * UUID cannot guarantee. flowId/nodeId/connectionId are embedded verbatim as
 * BPMN element ids by the runtime, so they are generated here with a fixed
 * prefix instead of a bare UUID.
 */
public final class FlowIds {

    private FlowIds() {
    }

    public static String newFlowId() {
        return "Process_" + UUID.randomUUID();
    }

    public static String newNodeId() {
        return "Node_" + UUID.randomUUID();
    }

    public static String newConnectionId() {
        return "Flow_" + UUID.randomUUID();
    }
}
