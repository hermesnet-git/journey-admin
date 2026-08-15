package com.jouney.admin.interfaces.flow;

import com.jouney.admin.application.flow.ConnectorTestResult;
import java.util.Map;

public record ConnectorTestResponse(int status, Map<String, String> headers, String body) {

    public static ConnectorTestResponse from(ConnectorTestResult result) {
        return new ConnectorTestResponse(result.status(), result.headers(), result.body());
    }
}
