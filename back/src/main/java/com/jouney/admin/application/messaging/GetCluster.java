package com.jouney.admin.application.messaging;

import com.jouney.admin.domain.messaging.MessagingCluster;
import com.jouney.admin.domain.messaging.MessagingClusterNotFoundException;
import com.jouney.admin.domain.messaging.MessagingClusterRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class GetCluster {

    private final MessagingClusterRepository clusterRepository;

    public GetCluster(MessagingClusterRepository clusterRepository) {
        this.clusterRepository = clusterRepository;
    }

    public MessagingCluster execute(UUID id) {
        return clusterRepository.findById(id)
                .orElseThrow(() -> new MessagingClusterNotFoundException(id));
    }
}
