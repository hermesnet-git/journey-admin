package com.jouney.admin.application.messaging;

import com.jouney.admin.domain.messaging.MessagingCluster;
import com.jouney.admin.domain.messaging.MessagingClusterNotFoundException;
import com.jouney.admin.domain.messaging.MessagingClusterRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class ListClusterTopics {

    private final MessagingClusterRepository clusterRepository;
    private final MessagingTopicListingPort topicListingPort;

    public ListClusterTopics(MessagingClusterRepository clusterRepository, MessagingTopicListingPort topicListingPort) {
        this.clusterRepository = clusterRepository;
        this.topicListingPort = topicListingPort;
    }

    public TopicListingResult execute(UUID clusterId, String credentialReferenceName) {
        MessagingCluster cluster = clusterRepository.findById(clusterId)
                .orElseThrow(() -> new MessagingClusterNotFoundException(clusterId));
        return topicListingPort.listTopics(cluster.getType().name(), cluster.getConnectionAddress(), credentialReferenceName);
    }
}
