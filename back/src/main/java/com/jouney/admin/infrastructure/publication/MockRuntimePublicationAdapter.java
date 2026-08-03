package com.jouney.admin.infrastructure.publication;

import com.jouney.admin.application.publication.RuntimePublicationPort;
import com.jouney.admin.domain.publication.Publication;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

// ponytail: MVP mock per REQ-07.01.003/004 — always "succeeds", standing in for an
// outbound HTTP call to the runtime's publication API. Replace with a real client
// (and let failures propagate) once the runtime exposes that endpoint.
@Component
public class MockRuntimePublicationAdapter implements RuntimePublicationPort {

    private static final Logger log = LoggerFactory.getLogger(MockRuntimePublicationAdapter.class);

    @Override
    public void publish(Publication snapshot) {
        log.info("[mock runtime] publish journey={} nodes={} forms={}", snapshot.getJourneyId(),
                snapshot.getFlowNodes().size(), snapshot.getForms().size());
    }

    @Override
    public void unpublish(UUID journeyId) {
        log.info("[mock runtime] unpublish journey={}", journeyId);
    }
}
