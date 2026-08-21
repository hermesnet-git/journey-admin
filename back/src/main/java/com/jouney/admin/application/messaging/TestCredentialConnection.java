package com.jouney.admin.application.messaging;

import com.jouney.admin.domain.messaging.CredentialReference;
import com.jouney.admin.domain.messaging.CredentialReferenceNotFoundException;
import com.jouney.admin.domain.messaging.CredentialReferenceRepository;
import com.jouney.admin.domain.messaging.MessagingCluster;
import com.jouney.admin.domain.messaging.MessagingClusterNotFoundException;
import com.jouney.admin.domain.messaging.MessagingClusterRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class TestCredentialConnection {

    private final CredentialReferenceRepository credentialRepository;
    private final MessagingClusterRepository clusterRepository;
    private final MessagingConnectionTestPort connectionTestPort;

    public TestCredentialConnection(CredentialReferenceRepository credentialRepository,
                                     MessagingClusterRepository clusterRepository,
                                     MessagingConnectionTestPort connectionTestPort) {
        this.credentialRepository = credentialRepository;
        this.clusterRepository = clusterRepository;
        this.connectionTestPort = connectionTestPort;
    }

    public ConnectionTestResult execute(UUID credentialId) {
        CredentialReference credential = credentialRepository.findById(credentialId)
                .orElseThrow(() -> new CredentialReferenceNotFoundException(credentialId));
        MessagingCluster cluster = clusterRepository.findById(credential.getClusterId())
                .orElseThrow(() -> new MessagingClusterNotFoundException(credential.getClusterId()));

        return connectionTestPort.test(cluster.getType().name(), cluster.getConnectionAddress(),
                credential.getReferenceName());
    }
}
