package com.jouney.admin.application.messaging;

import com.jouney.admin.domain.messaging.CredentialReference;
import com.jouney.admin.domain.messaging.CredentialReferenceNotFoundException;
import com.jouney.admin.domain.messaging.CredentialReferenceRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class ActivateCredential {

    private final CredentialReferenceRepository credentialRepository;

    public ActivateCredential(CredentialReferenceRepository credentialRepository) {
        this.credentialRepository = credentialRepository;
    }

    public void execute(UUID id) {
        CredentialReference credential = credentialRepository.findById(id)
                .orElseThrow(() -> new CredentialReferenceNotFoundException(id));
        credential.activate();
        credentialRepository.save(credential);
    }
}
