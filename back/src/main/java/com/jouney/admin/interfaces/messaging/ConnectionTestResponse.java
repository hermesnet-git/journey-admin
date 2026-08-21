package com.jouney.admin.interfaces.messaging;

import com.jouney.admin.application.messaging.ConnectionTestResult;

public record ConnectionTestResponse(boolean ok, String message) {

    public static ConnectionTestResponse from(ConnectionTestResult result) {
        return new ConnectionTestResponse(result.ok(), result.message());
    }
}
