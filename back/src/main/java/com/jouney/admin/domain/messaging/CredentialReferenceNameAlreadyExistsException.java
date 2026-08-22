package com.jouney.admin.domain.messaging;

public class CredentialReferenceNameAlreadyExistsException extends RuntimeException {

    public CredentialReferenceNameAlreadyExistsException(String referenceName) {
        super("Já existe uma credencial cadastrada com o nome de referência \"" + referenceName + "\".");
    }
}
