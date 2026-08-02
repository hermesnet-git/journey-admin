package com.jouney.admin.infrastructure.publication;

import com.jouney.admin.application.HasEverBeenPublishedPort;
import java.util.UUID;
import org.springframework.stereotype.Component;

// ponytail: journey_publication does not exist until EP-06 is implemented,
// so no journey has ever been published yet. Replace with a real query once it lands.
@Component
public class NeverPublishedAdapter implements HasEverBeenPublishedPort {

    @Override
    public boolean hasEverBeenPublished(UUID journeyId) {
        return false;
    }
}
