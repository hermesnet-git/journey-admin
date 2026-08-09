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
 * has one or more versions; exactly one may be PUBLISHED at a time.
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

    private String journeyName;
    private String journeyDescription;
    private UUID productId;
    private String productName;
    private UUID channelId;
    private String channelName;
    private ChannelType channelType;
    private List<FlowNode> flowNodes;
    private List<FlowConnection> flowConnections;
    private List<Form> forms;

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

    // Keeps a DRAFT in sync with the journey's live flow as it's edited (REQ-06.02.009): unlike
    // publish/deactivate, this doesn't change identity (id/versionNumber) — it's the same draft,
    // just with fresher content. Only DRAFT may be replaced this way; other statuses stay immutable.
    public void replaceContent(String journeyName, String journeyDescription, UUID productId, String productName,
                                UUID channelId, String channelName, ChannelType channelType,
                                List<FlowNode> flowNodes, List<FlowConnection> flowConnections, List<Form> forms) {
        if (status != VersionStatus.DRAFT) {
            throw new IllegalStateException("Only a DRAFT version's content can be replaced: " + id);
        }
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

    public void publish() {
        this.status = VersionStatus.PUBLISHED;
        this.publishedAt = OffsetDateTime.now();
    }

    // Companion to Journey.deactivate(): used when a journey that was once published can't be
    // physically deleted (REQ-02.01.005) and gets soft-deleted instead — every one of its versions
    // is marked INACTIVE alongside the journey itself (REQ-02.01.006).
    public void deactivate() {
        this.status = VersionStatus.INACTIVE;
    }

    public void unpublish() {
        this.status = VersionStatus.UNPUBLISHED;
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
