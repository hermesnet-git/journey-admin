package com.jouney.admin.infrastructure.journey;

import com.jouney.admin.application.JourneyCountPort;
import java.util.UUID;
import org.springframework.stereotype.Component;

// ponytail: journey does not exist until EP-02 is implemented, so every channel
// has zero journeys for now. Replace with a real query once EP-02 lands.
@Component
public class NoJourneysYetAdapter implements JourneyCountPort {

    @Override
    public long countByChannelId(UUID channelId) {
        return 0;
    }
}
