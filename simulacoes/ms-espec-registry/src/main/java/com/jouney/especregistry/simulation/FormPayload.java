package com.jouney.especregistry.simulation;

import com.jouney.especregistry.sdui.SduiScreenEnvelope;
import java.util.Map;
import java.util.UUID;

public record FormPayload(UUID id, String name, String description, SduiScreenEnvelope sdui,
                          Map<String, Object> context) {
}
