package com.jouney.admin.domain.messaging;

import java.util.UUID;

public class CredentialReferenceNotFoundException extends RuntimeException {

    public CredentialReferenceNotFoundException(UUID id) {
        super("Credential reference not found: " + id);
    }
}
