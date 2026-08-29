package com.jouney.journey.especregistry;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = true)
public record FormPayload(UUID id, String name, String description, List<Object> sdui) {
}
