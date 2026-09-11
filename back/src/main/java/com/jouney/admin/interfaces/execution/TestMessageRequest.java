package com.jouney.admin.interfaces.execution;

import java.util.Map;

public record TestMessageRequest(String correlationId, String messageName, Map<String, Object> data) {
}
