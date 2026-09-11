package com.jouney.admin.interfaces.execution;

import java.util.Map;

public record CompleteTaskRequest(Map<String, Object> answers) {
}
