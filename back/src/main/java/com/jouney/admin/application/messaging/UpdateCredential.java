package com.jouney.admin.application.messaging;

import com.jouney.admin.application.audit.RecordAuditEvent;
import com.jouney.admin.domain.audit.AuditResult;
import com.jouney.admin.domain.messaging.CredentialReference;
import com.jouney.admin.domain.messaging.CredentialReferenceNameAlreadyExistsException;
import com.jouney.admin.domain.messaging.CredentialReferenceNotFoundException;
import com.jouney.admin.domain.messaging.CredentialReferenceRepository;
import com.jouney.admin.domain.messaging.MessagingClusterNotFoundException;
import com.jouney.admin.domain.messaging.MessagingClusterRepository;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

@Service
public class UpdateCredential {

    private final CredentialReferenceRepository credentialRepository;
    private final MessagingClusterRepository clusterRepository;
    private final RecordAuditEvent recordAuditEvent;

    public UpdateCredential(CredentialReferenceRepository credentialRepository,
                             MessagingClusterRepository clusterRepository, RecordAuditEvent recordAuditEvent) {
        this.credentialRepository = credentialRepository;
        this.clusterRepository = clusterRepository;
        this.recordAuditEvent = recordAuditEvent;
    }

    public CredentialReference execute(UUID id, String referenceName, UUID clusterId, String keyVaultUri,
                                        String secretName) {
        CredentialReference credential = credentialRepository.findById(id)
                .orElseThrow(() -> new CredentialReferenceNotFoundException(id));
        clusterRepository.findById(clusterId)
                .orElseThrow(() -> new MessagingClusterNotFoundException(clusterId));

        credential.update(referenceName, clusterId, keyVaultUri, secretName);
        CredentialReference saved;
        try {
            saved = credentialRepository.save(credential);
        } catch (DataIntegrityViolationException e) {
            throw new CredentialReferenceNameAlreadyExistsException(referenceName);
        }
        recordAuditEvent.record("CREDENTIAL_UPDATE", "CREDENTIAL_REFERENCE", id, AuditResult.SUCCESS);
        return saved;
    }
}
