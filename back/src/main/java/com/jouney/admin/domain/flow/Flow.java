package com.jouney.admin.domain.flow;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public class Flow {

    private final String id;
    private final UUID journeyId;
    private String name;
    private List<FlowNode> nodes;
    private List<FlowConnection> connections;
    private final OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public Flow(String id, UUID journeyId, String name, List<FlowNode> nodes, List<FlowConnection> connections,
                OffsetDateTime createdAt, OffsetDateTime updatedAt) {
        this.id = id;
        this.journeyId = journeyId;
        this.name = name;
        this.nodes = nodes;
        this.connections = connections;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    // Product decision (supersedes the original REQ-03.01.005 reading): a new
    // journey's flow starts completely empty; the user adds START, END and
    // everything else before saving.
    public static Flow initial(UUID journeyId) {
        OffsetDateTime now = OffsetDateTime.now();
        return new Flow(FlowIds.newFlowId(), journeyId, "Fluxo principal", List.of(), List.of(), now, now);
    }

    public void replace(String name, List<FlowNode> nodes, List<FlowConnection> connections) {
        FlowValidator.validate(nodes, connections);
        this.name = name;
        this.nodes = nodes;
        this.connections = connections;
        this.updatedAt = OffsetDateTime.now();
    }

    public String getId() {
        return id;
    }

    public UUID getJourneyId() {
        return journeyId;
    }

    public String getName() {
        return name;
    }

    public List<FlowNode> getNodes() {
        return nodes;
    }

    public List<FlowConnection> getConnections() {
        return connections;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
