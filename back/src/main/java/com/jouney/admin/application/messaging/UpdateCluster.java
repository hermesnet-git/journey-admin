package com.jouney.admin.application.messaging;

import com.jouney.admin.application.audit.RecordAuditEvent;
import com.jouney.admin.domain.audit.AuditResult;
import com.jouney.admin.domain.messaging.ClusterType;
import com.jouney.admin.domain.messaging.MessagingCluster;
import com.jouney.admin.domain.messaging.MessagingClusterNotFoundException;
import com.jouney.admin.domain.messaging.MessagingClusterRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class UpdateCluster {

    private final MessagingClusterRepository clusterRepository;
    private final RecordAuditEvent recordAuditEvent;

    public UpdateCluster(MessagingClusterRepository clusterRepository, RecordAuditEvent recordAuditEvent) {
        this.clusterRepository = clusterRepository;
        this.recordAuditEvent = recordAuditEvent;
    }

    public MessagingCluster execute(UUID id, String name, ClusterType type, String connectionAddress) {
        MessagingCluster cluster = clusterRepository.findById(id)
                .orElseThrow(() -> new MessagingClusterNotFoundException(id));

        cluster.update(name, type, connectionAddress);
        MessagingCluster saved = clusterRepository.save(cluster);
        recordAuditEvent.record("CLUSTER_UPDATE", "MESSAGING_CLUSTER", id, AuditResult.SUCCESS);
        return saved;
    }
}
