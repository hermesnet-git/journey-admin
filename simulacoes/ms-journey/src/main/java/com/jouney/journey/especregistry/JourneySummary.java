package com.jouney.journey.especregistry;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.UUID;

/** Mapeia o JourneySummary do ms-espec-registry (GET /api/v1/journeys), acrescido do channelType
 * técnico (WEB/MOBILE) — que não vem nesse endpoint, só em FlowBundle — usado pra filtrar por canal. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record JourneySummary(UUID journeyId, String name, String description, String productName,
                              String channelName, Integer publishedVersionNumber, String channelType) {

    public JourneySummary withChannelType(String channelType) {
        return new JourneySummary(journeyId, name, description, productName, channelName, publishedVersionNumber, channelType);
    }
}
