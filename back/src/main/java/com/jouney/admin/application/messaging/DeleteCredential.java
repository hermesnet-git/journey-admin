package com.jouney.admin.application.messaging;

import com.jouney.admin.application.audit.RecordAuditEvent;
import com.jouney.admin.domain.audit.AuditResult;
import com.jouney.admin.domain.messaging.CredentialInUseException;
import com.jouney.admin.domain.messaging.CredentialReference;
import com.jouney.admin.domain.messaging.CredentialReferenceNotFoundException;
import com.jouney.admin.domain.messaging.CredentialReferenceRepository;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class DeleteCredential {

    private final CredentialReferenceRepository credentialRepository;
    private final MessagingReferenceInUsePort referenceInUsePort;
    private final RecordAuditEvent recordAuditEvent;

    public DeleteCredential(CredentialReferenceRepository credentialRepository,
                             MessagingReferenceInUsePort referenceInUsePort, RecordAuditEvent recordAuditEvent) {
        this.credentialRepository = credentialRepository;
        this.referenceInUsePort = referenceInUsePort;
        this.recordAuditEvent = recordAuditEvent;
    }

    public void execute(UUID id) {
        CredentialReference credential = credentialRepository.findById(id)
                .orElseThrow(() -> new CredentialReferenceNotFoundException(id));

        Optional<String> journeyName =
                referenceInUsePort.findPublishedJourneyNameReferencingCredential(credential.getReferenceName());
        if (journeyName.isPresent()) {
            throw new CredentialInUseException("Não é possível excluir a credencial \"" + credential.getReferenceName()
                    + "\": ela está associada à jornada publicada \"" + journeyName.get() + "\".");
        }

        credentialRepository.deleteById(id);
        recordAuditEvent.record("CREDENTIAL_DELETE", "CREDENTIAL_REFERENCE", id, AuditResult.SUCCESS);
    }
}
