package com.jouney.especregistry.adminback;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.UUID;

/** Mapeia só os campos usados do JourneyResponse do admin/back (GET /api/v1/journeys). */
@JsonIgnoreProperties(ignoreUnknown = true)
public record JourneySummary(UUID journeyId, String name, String description, String productName,
                              String channelName) {
}
