package com.jouney.admin.application.messaging;

import com.jouney.admin.domain.Status;
import com.jouney.admin.domain.messaging.CredentialReference;
import com.jouney.admin.domain.messaging.CredentialReferenceRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class FindCredentials {

    private final CredentialReferenceRepository credentialRepository;

    public FindCredentials(CredentialReferenceRepository credentialRepository) {
        this.credentialRepository = credentialRepository;
    }

    public List<CredentialReference> execute(String query, UUID clusterId, Status status) {
        return credentialRepository.search(query, clusterId, status);
    }
}
