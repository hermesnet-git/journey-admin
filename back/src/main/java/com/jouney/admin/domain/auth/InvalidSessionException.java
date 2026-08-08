package com.jouney.admin.domain.auth;

public class InvalidSessionException extends RuntimeException {

    public InvalidSessionException(String message) {
        super(message);
    }
}
