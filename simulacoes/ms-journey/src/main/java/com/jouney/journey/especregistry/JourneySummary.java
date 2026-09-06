package com.jouney.journey.especregistry;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import java.util.UUID;

/** Mapeia o JourneySummary do ms-espec-registry (GET /api/v1/journeys). */
@JsonIgnoreProperties(ignoreUnknown = true)
public record JourneySummary(UUID journeyId, String name, String description, String productName,
                              List<String> channelTypes, Integer publishedVersionNumber) {
}
