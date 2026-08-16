package com.jouney.especregistry.simulation;

import java.util.List;
import java.util.UUID;

public record FormPayload(UUID id, String name, String description, List<Object> sdui) {
}
