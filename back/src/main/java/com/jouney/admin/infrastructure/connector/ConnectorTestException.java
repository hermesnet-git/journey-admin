package com.jouney.admin.infrastructure.connector;

/** The upstream call made for a connector test failed or timed out. */
public class ConnectorTestException extends RuntimeException {

    public ConnectorTestException(String message, Throwable cause) {
        super(message, cause);
    }
}
