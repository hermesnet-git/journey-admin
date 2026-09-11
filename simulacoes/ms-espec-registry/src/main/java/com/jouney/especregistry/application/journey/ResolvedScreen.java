package com.jouney.especregistry.application.journey;

import com.jouney.especregistry.domain.sdui.ScreenEnvelope;
import java.util.Map;

public record ResolvedScreen(String nodeName, ScreenEnvelope envelope, Map<String, Object> context) {
}
