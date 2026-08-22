package com.jouney.admin.interfaces.messaging;

import com.jouney.admin.domain.messaging.ClusterType;
import com.jouney.admin.domain.messaging.MessagingCluster;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ClusterResponse(UUID clusterId, String name, ClusterType type, String connectionAddress,
                               OffsetDateTime createdAt, OffsetDateTime updatedAt) {

    public static ClusterResponse from(MessagingCluster cluster) {
        return new ClusterResponse(cluster.getId(), cluster.getName(), cluster.getType(),
                cluster.getConnectionAddress(), cluster.getCreatedAt(), cluster.getUpdatedAt());
    }
}
