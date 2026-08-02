package com.jouney.admin.infrastructure.publication;

import com.jouney.admin.application.ActivePublicationPort;
import java.util.UUID;
import org.springframework.stereotype.Component;

// ponytail: journey_publication does not exist until EP-06 is implemented,
// so no publication can be active yet. Replace with a real query once it lands.
@Component
public class NoPublicationsYetAdapter implements ActivePublicationPort {

    @Override
    public boolean existsForProduct(UUID productId) {
        return false;
    }

    @Override
    public boolean existsForChannel(UUID channelId) {
        return false;
    }

    @Override
    public boolean existsForJourney(UUID journeyId) {
        return false;
    }
}
