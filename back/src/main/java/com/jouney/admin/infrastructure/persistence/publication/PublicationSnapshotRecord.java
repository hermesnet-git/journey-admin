package com.jouney.admin.infrastructure.persistence.publication;

import com.jouney.admin.domain.channel.ChannelType;
import com.jouney.admin.infrastructure.persistence.flow.FlowConnectionRecord;
import com.jouney.admin.infrastructure.persistence.flow.FlowNodeRecord;
import java.util.List;
import java.util.UUID;

public record PublicationSnapshotRecord(UUID journeyId, String journeyName, String journeyDescription,
                                         UUID productId, String productName, UUID channelId, String channelName,
                                         ChannelType channelType, List<FlowNodeRecord> flowNodes,
                                         List<FlowConnectionRecord> flowConnections, List<SnapshotFormRecord> forms) {
}
