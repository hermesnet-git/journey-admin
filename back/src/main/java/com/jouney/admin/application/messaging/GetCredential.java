package com.jouney.admin.application.messaging;

import com.jouney.admin.domain.messaging.CredentialReference;
import com.jouney.admin.domain.messaging.CredentialReferenceNotFoundException;
import com.jouney.admin.domain.messaging.CredentialReferenceRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class GetCredential {

    private final CredentialReferenceRepository credentialRepository;

    public GetCredential(CredentialReferenceRepository credentialRepository) {
        this.credentialRepository = credentialRepository;
    }

    public CredentialReference execute(UUID id) {
        return credentialRepository.findById(id)
                .orElseThrow(() -> new CredentialReferenceNotFoundException(id));
    }
}
