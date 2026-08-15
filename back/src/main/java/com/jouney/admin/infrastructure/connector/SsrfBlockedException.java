package com.jouney.admin.infrastructure.connector;

/** REQ-03.10.003: the tested URL resolves to a private, loopback or reserved address. */
public class SsrfBlockedException extends RuntimeException {

    public SsrfBlockedException(String message) {
        super(message);
    }
}
