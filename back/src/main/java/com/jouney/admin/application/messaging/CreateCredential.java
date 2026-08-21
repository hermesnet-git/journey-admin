package com.jouney.admin.application.messaging;

import com.jouney.admin.application.audit.RecordAuditEvent;
import com.jouney.admin.domain.audit.AuditResult;
import com.jouney.admin.domain.messaging.CredentialReference;
import com.jouney.admin.domain.messaging.CredentialReferenceRepository;
import com.jouney.admin.domain.messaging.MessagingClusterNotFoundException;
import com.jouney.admin.domain.messaging.MessagingClusterRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class CreateCredential {

    private final CredentialReferenceRepository credentialRepository;
    private final MessagingClusterRepository clusterRepository;
    private final RecordAuditEvent recordAuditEvent;

    public CreateCredential(CredentialReferenceRepository credentialRepository,
                             MessagingClusterRepository clusterRepository, RecordAuditEvent recordAuditEvent) {
        this.credentialRepository = credentialRepository;
        this.clusterRepository = clusterRepository;
        this.recordAuditEvent = recordAuditEvent;
    }

    public CredentialReference execute(String referenceName, UUID clusterId, String keyVaultUri, String secretName) {
        clusterRepository.findById(clusterId)
                .orElseThrow(() -> new MessagingClusterNotFoundException(clusterId));

        CredentialReference credential = credentialRepository.save(
                CredentialReference.create(referenceName, clusterId, keyVaultUri, secretName));
        recordAuditEvent.record("CREDENTIAL_CREATE", "CREDENTIAL_REFERENCE", credential.getId(), AuditResult.SUCCESS);
        return credential;
    }
}
