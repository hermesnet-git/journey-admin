package com.jouney.admin.application.journey;

import com.jouney.admin.domain.journey.Journey;
import java.util.UUID;

public record JourneyView(Journey journey, UUID productId, String productName, String channelName) {
}
