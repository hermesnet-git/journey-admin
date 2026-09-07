package com.jouney.admin.domain.version;

import com.jouney.admin.domain.channel.ChannelType;
import com.jouney.admin.domain.flow.FlowConnection;
import com.jouney.admin.domain.flow.FlowNode;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * A point-in-time snapshot of a journey's flow/product/channel-types data (EP-06). Each journey
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
    // Deployment do Camunda gerado por este publish/republish específico — permite despublicar só
    // esta versão (deletar só o deployment dela) sem afetar outra versão da mesma jornada que
    // também esteja publicada. Null pra versões nunca publicadas, ou publicadas antes dessa
    // rastreabilidade existir.
    private String runtimeDeploymentId;

    private String journeyName;
    private String journeyDescription;
    private UUID productId;
    private String productName;
    private List<ChannelType> channelTypes;
    private List<FlowNode> flowNodes;
    private List<FlowConnection> flowConnections;

    public JourneyVersion(UUID id, UUID journeyId, int versionNumber, VersionStatus status, String description,
                           UUID createdBy, OffsetDateTime createdAt, OffsetDateTime publishedAt,
                           String runtimeDeploymentId, String journeyName, String journeyDescription, UUID productId,
                           String productName, List<ChannelType> channelTypes, List<FlowNode> flowNodes,
                           List<FlowConnection> flowConnections) {
        this.id = id;
        this.journeyId = journeyId;
        this.versionNumber = versionNumber;
        this.status = status;
        this.description = description;
        this.createdBy = createdBy;
        this.createdAt = createdAt;
        this.publishedAt = publishedAt;
        this.runtimeDeploymentId = runtimeDeploymentId;
        this.journeyName = journeyName;
        this.journeyDescription = journeyDescription;
        this.productId = productId;
        this.productName = productName;
        this.channelTypes = channelTypes;
        this.flowNodes = flowNodes;
        this.flowConnections = flowConnections;
    }

    public static JourneyVersion createDraft(UUID journeyId, int versionNumber, String description, UUID createdBy,
                                              String journeyName, String journeyDescription, UUID productId,
                                              String productName, List<ChannelType> channelTypes,
                                              List<FlowNode> flowNodes, List<FlowConnection> flowConnections) {
        return new JourneyVersion(UUID.randomUUID(), journeyId, versionNumber, VersionStatus.DRAFT, description,
                createdBy, OffsetDateTime.now(), null, null, journeyName, journeyDescription, productId, productName,
                channelTypes, flowNodes, flowConnections);
    }

    // Keeps a DRAFT in sync with the journey's live flow as it's edited (REQ-06.02.009): unlike
    // publish/deactivate, this doesn't change identity (id/versionNumber) — it's the same draft,
    // just with fresher content. Only DRAFT may be replaced this way; other statuses stay immutable.
    public void replaceContent(String journeyName, String journeyDescription, UUID productId, String productName,
                                List<ChannelType> channelTypes, List<FlowNode> flowNodes,
                                List<FlowConnection> flowConnections) {
        if (status != VersionStatus.DRAFT) {
            throw new IllegalStateException("Only a DRAFT version's content can be replaced: " + id);
        }
        this.journeyName = journeyName;
        this.journeyDescription = journeyDescription;
        this.productId = productId;
        this.productName = productName;
        this.channelTypes = channelTypes;
        this.flowNodes = flowNodes;
        this.flowConnections = flowConnections;
    }

    public void publish(String runtimeDeploymentId) {
        this.status = VersionStatus.PUBLISHED;
        this.publishedAt = OffsetDateTime.now();
        this.runtimeDeploymentId = runtimeDeploymentId;
    }

    // Companion to Journey.deactivate(): used when a journey that was once published can't be
    // physically deleted (REQ-02.01.005) and gets soft-deleted instead — every one of its versions
    // is marked INACTIVE alongside the journey itself (REQ-02.01.006).
    public void deactivate() {
        this.status = VersionStatus.INACTIVE;
    }

    public void unpublish() {
        this.status = VersionStatus.UNPUBLISHED;
        // O deployment que esse id apontava pra já não existe mais no Camunda depois de
        // despublicar — limpa pra não sobrar uma referência morta.
        this.runtimeDeploymentId = null;
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

    public String getRuntimeDeploymentId() {
        return runtimeDeploymentId;
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

    public List<ChannelType> getChannelTypes() {
        return channelTypes;
    }

    public List<FlowNode> getFlowNodes() {
        return flowNodes;
    }

    public List<FlowConnection> getFlowConnections() {
        return flowConnections;
    }
}
