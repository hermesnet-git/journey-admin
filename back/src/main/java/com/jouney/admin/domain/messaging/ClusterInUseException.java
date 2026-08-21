package com.jouney.admin.domain.messaging;

public class ClusterInUseException extends RuntimeException {

    public ClusterInUseException(String message) {
        super(message);
    }
}
