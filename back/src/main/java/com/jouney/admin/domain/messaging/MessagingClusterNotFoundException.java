package com.jouney.admin.domain.messaging;

import java.util.UUID;

public class MessagingClusterNotFoundException extends RuntimeException {

    public MessagingClusterNotFoundException(UUID id) {
        super("Messaging cluster not found: " + id);
    }
}
