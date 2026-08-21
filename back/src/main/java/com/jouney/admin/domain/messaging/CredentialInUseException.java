package com.jouney.admin.domain.messaging;

public class CredentialInUseException extends RuntimeException {

    public CredentialInUseException(String message) {
        super(message);
    }
}
