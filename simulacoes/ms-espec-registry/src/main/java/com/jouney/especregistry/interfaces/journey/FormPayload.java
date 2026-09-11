package com.jouney.especregistry.interfaces.journey;

import com.jouney.especregistry.domain.sdui.ScreenEnvelope;
import java.util.Map;
import java.util.UUID;

public record FormPayload(UUID id, String name, String description, ScreenEnvelope sdui,
                          Map<String, Object> context) {
}
