package com.jouney.admin.interfaces.version;

import com.jouney.admin.domain.channel.ChannelType;
import com.jouney.admin.domain.flow.FlowConnection;
import com.jouney.admin.domain.version.JourneyVersion;
import com.jouney.admin.domain.version.VersionStatus;
import com.jouney.admin.infrastructure.persistence.flow.FlowNodeRecord;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record JourneyVersionResponse(UUID versionId, UUID journeyId, int versionNumber, VersionStatus status,
                                      String description, VersionSnapshotResponse snapshot, UUID createdBy,
                                      OffsetDateTime createdAt, OffsetDateTime publishedAt) {

    public static JourneyVersionResponse from(JourneyVersion version) {
        var snapshot = new VersionSnapshotResponse(version.getJourneyName(), version.getJourneyDescription(),
                version.getProductId(), version.getProductName(), version.getChannelTypes(),
                version.getFlowNodes().stream()
                        .map(n -> new FlowNodeRecord(n.getId(), n.getType(), n.getName(), n.getDescription(),
                                n.getPositionX(), n.getPositionY(),
                                FlowNodeRecord.ConnectorConfigRecord.from(n.getConnectorConfig()),
                                n.getStartVariables(), n.getMessageText(), n.getEmbeddedScreenRoot()))
                        .toList(),
                version.getFlowConnections());
        return new JourneyVersionResponse(version.getId(), version.getJourneyId(), version.getVersionNumber(),
                version.getStatus(), version.getDescription(), snapshot, version.getCreatedBy(),
                version.getCreatedAt(), version.getPublishedAt());
    }

    public record VersionSnapshotResponse(String journeyName, String journeyDescription, UUID productId,
                                           String productName, List<ChannelType> channelTypes,
                                           List<FlowNodeRecord> flowNodes, List<FlowConnection> flowConnections) {
    }
}
