package com.jouney.admin.application.flow;

import java.util.Map;

/** Raw response from a connector test call, used to help write outputMapping jsonPath rules. */
public record ConnectorTestResult(int status, Map<String, String> headers, String body) {
}
