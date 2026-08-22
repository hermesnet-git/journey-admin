package com.jouney.admin.application.messaging;

import com.jouney.admin.application.audit.RecordAuditEvent;
import com.jouney.admin.domain.audit.AuditResult;
import com.jouney.admin.domain.messaging.ClusterNameAlreadyExistsException;
import com.jouney.admin.domain.messaging.ClusterType;
import com.jouney.admin.domain.messaging.MessagingCluster;
import com.jouney.admin.domain.messaging.MessagingClusterRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

@Service
public class CreateCluster {

    private final MessagingClusterRepository clusterRepository;
    private final RecordAuditEvent recordAuditEvent;

    public CreateCluster(MessagingClusterRepository clusterRepository, RecordAuditEvent recordAuditEvent) {
        this.clusterRepository = clusterRepository;
        this.recordAuditEvent = recordAuditEvent;
    }

    public MessagingCluster execute(String name, ClusterType type, String connectionAddress) {
        MessagingCluster cluster;
        try {
            cluster = clusterRepository.save(MessagingCluster.create(name, type, connectionAddress));
        } catch (DataIntegrityViolationException e) {
            throw new ClusterNameAlreadyExistsException(name);
        }
        recordAuditEvent.record("CLUSTER_CREATE", "MESSAGING_CLUSTER", cluster.getId(), AuditResult.SUCCESS);
        return cluster;
    }
}
