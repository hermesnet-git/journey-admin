package com.jouney.admin.application.messaging;

import com.jouney.admin.domain.messaging.MessagingCluster;
import com.jouney.admin.domain.messaging.MessagingClusterNotFoundException;
import com.jouney.admin.domain.messaging.MessagingClusterRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class ActivateCluster {

    private final MessagingClusterRepository clusterRepository;

    public ActivateCluster(MessagingClusterRepository clusterRepository) {
        this.clusterRepository = clusterRepository;
    }

    public void execute(UUID id) {
        MessagingCluster cluster = clusterRepository.findById(id)
                .orElseThrow(() -> new MessagingClusterNotFoundException(id));
        cluster.activate();
        clusterRepository.save(cluster);
    }
}
