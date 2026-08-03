package com.jouney.admin.application.publication;

import com.jouney.admin.domain.publication.Publication;
import java.util.UUID;

/**
 * Outbound call to the runtime's publication API (EP-07). In the MVP this is mocked
 * and always succeeds; a real implementation would perform an HTTP call here.
 */
public interface RuntimePublicationPort {

    void publish(Publication snapshot);

    void unpublish(UUID journeyId);
}
