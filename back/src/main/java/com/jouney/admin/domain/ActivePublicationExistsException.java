package com.jouney.admin.domain;

public class ActivePublicationExistsException extends RuntimeException {

    public ActivePublicationExistsException(String message) {
        super(message);
    }
}
