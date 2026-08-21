package com.jouney.admin.application.messaging;

import com.jouney.admin.domain.Status;
import com.jouney.admin.domain.messaging.ClusterType;
import com.jouney.admin.domain.messaging.MessagingCluster;
import com.jouney.admin.domain.messaging.MessagingClusterRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class FindClusters {

    private final MessagingClusterRepository clusterRepository;

    public FindClusters(MessagingClusterRepository clusterRepository) {
        this.clusterRepository = clusterRepository;
    }

    public List<MessagingCluster> execute(String query, ClusterType type, Status status) {
        return clusterRepository.search(query, type, status);
    }
}
