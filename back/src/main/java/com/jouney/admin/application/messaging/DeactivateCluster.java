package com.jouney.admin.application.messaging;

import com.jouney.admin.application.audit.RecordAuditEvent;
import com.jouney.admin.domain.Status;
import com.jouney.admin.domain.audit.AuditResult;
import com.jouney.admin.domain.messaging.ClusterInUseException;
import com.jouney.admin.domain.messaging.CredentialReferenceRepository;
import com.jouney.admin.domain.messaging.MessagingCluster;
import com.jouney.admin.domain.messaging.MessagingClusterNotFoundException;
import com.jouney.admin.domain.messaging.MessagingClusterRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class DeactivateCluster {

    private final MessagingClusterRepository clusterRepository;
    private final CredentialReferenceRepository credentialRepository;
    private final MessagingReferenceInUsePort referenceInUsePort;
    private final RecordAuditEvent recordAuditEvent;

    public DeactivateCluster(MessagingClusterRepository clusterRepository,
                              CredentialReferenceRepository credentialRepository,
                              MessagingReferenceInUsePort referenceInUsePort, RecordAuditEvent recordAuditEvent) {
        this.clusterRepository = clusterRepository;
        this.credentialRepository = credentialRepository;
        this.referenceInUsePort = referenceInUsePort;
        this.recordAuditEvent = recordAuditEvent;
    }

    public void execute(UUID id) {
        MessagingCluster cluster = clusterRepository.findById(id)
                .orElseThrow(() -> new MessagingClusterNotFoundException(id));

        if (!credentialRepository.search(null, id, Status.ACTIVE).isEmpty()) {
            throw new ClusterInUseException(
                    "Cannot deactivate cluster referenced by an active credential: " + id);
        }
        if (referenceInUsePort.existsPublishedConnectorForCluster(id)) {
            throw new ClusterInUseException(
                    "Cannot deactivate cluster referenced by a published journey's connector: " + id);
        }

        cluster.deactivate();
        clusterRepository.save(cluster);
        recordAuditEvent.record("CLUSTER_DEACTIVATE", "MESSAGING_CLUSTER", id, AuditResult.SUCCESS);
    }
}
