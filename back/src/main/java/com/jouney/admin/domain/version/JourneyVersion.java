package com.jouney.admin.domain.version;

import com.jouney.admin.domain.channel.ChannelType;
import com.jouney.admin.domain.flow.FlowConnection;
import com.jouney.admin.domain.flow.FlowNode;
import com.jouney.admin.domain.form.Form;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * A point-in-time snapshot of a journey's flow/forms/product/channel data (EP-06). Each journey
 * has one or more versions; exactly one may be PUBLISHED at a time, the rest are DRAFT/ARCHIVED.
 */
public class JourneyVersion {

    private final UUID id;
    private final UUID journeyId;
    private final int versionNumber;
    private VersionStatus status;
    private final String description;
    private final UUID createdBy;
    private final OffsetDateTime createdAt;
    private OffsetDateTime publishedAt;

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

    public JourneyVersion(UUID id, UUID journeyId, int versionNumber, VersionStatus status, String description,
                           UUID createdBy, OffsetDateTime createdAt, OffsetDateTime publishedAt, String journeyName,
                           String journeyDescription, UUID productId, String productName, UUID channelId,
                           String channelName, ChannelType channelType, List<FlowNode> flowNodes,
                           List<FlowConnection> flowConnections, List<Form> forms) {
        this.id = id;
        this.journeyId = journeyId;
        this.versionNumber = versionNumber;
        this.status = status;
        this.description = description;
        this.createdBy = createdBy;
        this.createdAt = createdAt;
        this.publishedAt = publishedAt;
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
    }

    public static JourneyVersion createDraft(UUID journeyId, int versionNumber, String description, UUID createdBy,
                                              String journeyName, String journeyDescription, UUID productId,
                                              String productName, UUID channelId, String channelName,
                                              ChannelType channelType, List<FlowNode> flowNodes,
                                              List<FlowConnection> flowConnections, List<Form> forms) {
        return new JourneyVersion(UUID.randomUUID(), journeyId, versionNumber, VersionStatus.DRAFT, description,
                createdBy, OffsetDateTime.now(), null, journeyName, journeyDescription, productId, productName,
                channelId, channelName, channelType, flowNodes, flowConnections, forms);
    }

    public void publish() {
        this.status = VersionStatus.PUBLISHED;
        this.publishedAt = OffsetDateTime.now();
    }

    public void archive() {
        this.status = VersionStatus.ARCHIVED;
    }

    public UUID getId() {
        return id;
    }

    public UUID getJourneyId() {
        return journeyId;
    }

    public int getVersionNumber() {
        return versionNumber;
    }

    public VersionStatus getStatus() {
        return status;
    }

    public String getDescription() {
        return description;
    }

    public UUID getCreatedBy() {
        return createdBy;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getPublishedAt() {
        return publishedAt;
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
}
