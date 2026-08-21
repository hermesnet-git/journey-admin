package com.jouney.admin.application.messaging;

import com.jouney.admin.application.audit.RecordAuditEvent;
import com.jouney.admin.domain.audit.AuditResult;
import com.jouney.admin.domain.messaging.CredentialInUseException;
import com.jouney.admin.domain.messaging.CredentialReference;
import com.jouney.admin.domain.messaging.CredentialReferenceNotFoundException;
import com.jouney.admin.domain.messaging.CredentialReferenceRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class DeactivateCredential {

    private final CredentialReferenceRepository credentialRepository;
    private final MessagingReferenceInUsePort referenceInUsePort;
    private final RecordAuditEvent recordAuditEvent;

    public DeactivateCredential(CredentialReferenceRepository credentialRepository,
                                 MessagingReferenceInUsePort referenceInUsePort, RecordAuditEvent recordAuditEvent) {
        this.credentialRepository = credentialRepository;
        this.referenceInUsePort = referenceInUsePort;
        this.recordAuditEvent = recordAuditEvent;
    }

    public void execute(UUID id) {
        CredentialReference credential = credentialRepository.findById(id)
                .orElseThrow(() -> new CredentialReferenceNotFoundException(id));

        if (referenceInUsePort.existsPublishedConnectorForCredential(credential.getReferenceName())) {
            throw new CredentialInUseException(
                    "Cannot deactivate credential referenced by a published journey's connector: " + id);
        }

        credential.deactivate();
        credentialRepository.save(credential);
        recordAuditEvent.record("CREDENTIAL_DEACTIVATE", "CREDENTIAL_REFERENCE", id, AuditResult.SUCCESS);
    }
}
