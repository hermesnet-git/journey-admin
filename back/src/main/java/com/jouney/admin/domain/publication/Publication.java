package com.jouney.admin.domain.publication;

import com.jouney.admin.domain.channel.ChannelType;
import com.jouney.admin.domain.flow.FlowConnection;
import com.jouney.admin.domain.flow.FlowNode;
import com.jouney.admin.domain.form.Form;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public class Publication {

    private final UUID id;
    private final UUID journeyId;
    private final String journeyName;
    private final String journeyDescription;
    private final UUID productId;
    private final String productName;
    private final UUID channelId;
    private final String channelName;
    private final ChannelType channelType;
    private final List<FlowNode> flowNodes;
    private final List<FlowConnection> flowConnections;
    private final List<Form> forms;
    private final OffsetDateTime publishedAt;
    private final OffsetDateTime createdAt;
    private final OffsetDateTime updatedAt;

    public Publication(UUID id, UUID journeyId, String journeyName, String journeyDescription, UUID productId,
                        String productName, UUID channelId, String channelName, ChannelType channelType,
                        List<FlowNode> flowNodes, List<FlowConnection> flowConnections, List<Form> forms,
                        OffsetDateTime publishedAt, OffsetDateTime createdAt, OffsetDateTime updatedAt) {
        this.id = id;
        this.journeyId = journeyId;
        this.journeyName = journeyName;
        this.journeyDescription = journeyDescription;
        this.productId = productId;
        this.productName = productName;
        this.channelId = channelId;
        this.channelName = channelName;
        this.channelType = channelType;
        this.flowNodes = flowNodes;
        this.flowConnections = flowConnections;
        this.forms = forms;
        this.publishedAt = publishedAt;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    // existingId is non-null on republish (keeps the same row/PK, replacing it entirely);
    // null on first publish for the journey.
    public static Publication create(UUID existingId, UUID journeyId, String journeyName, String journeyDescription,
                                      UUID productId, String productName, UUID channelId, String channelName,
                                      ChannelType channelType, List<FlowNode> flowNodes,
                                      List<FlowConnection> flowConnections, List<Form> forms) {
        OffsetDateTime now = OffsetDateTime.now();
        UUID id = existingId != null ? existingId : UUID.randomUUID();
        return new Publication(id, journeyId, journeyName, journeyDescription, productId, productName, channelId,
                channelName, channelType, flowNodes, flowConnections, forms, now, now, now);
    }

    public UUID getId() {
        return id;
    }

    public UUID getJourneyId() {
        return journeyId;
    }

    public String getJourneyName() {
        return journeyName;
    }

    public String getJourneyDescription() {
        return journeyDescription;
    }

    public UUID getProductId() {
        return productId;
    }

    public String getProductName() {
        return productName;
    }

    public UUID getChannelId() {
        return channelId;
    }

    public String getChannelName() {
        return channelName;
    }

    public ChannelType getChannelType() {
        return channelType;
    }

    public List<FlowNode> getFlowNodes() {
        return flowNodes;
    }

    public List<FlowConnection> getFlowConnections() {
        return flowConnections;
    }

    public List<Form> getForms() {
        return forms;
    }

    public OffsetDateTime getPublishedAt() {
        return publishedAt;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
