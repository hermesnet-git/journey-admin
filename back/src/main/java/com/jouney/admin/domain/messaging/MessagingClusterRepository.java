package com.jouney.admin.domain.messaging;

import com.jouney.admin.domain.Status;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MessagingClusterRepository {

    MessagingCluster save(MessagingCluster cluster);

    Optional<MessagingCluster> findById(UUID id);

    List<MessagingCluster> search(String query, ClusterType type, Status status);
}
