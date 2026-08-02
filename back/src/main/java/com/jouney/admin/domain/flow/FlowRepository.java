package com.jouney.admin.domain.flow;

import java.util.Optional;
import java.util.UUID;

public interface FlowRepository {

    Flow save(Flow flow);

    Optional<Flow> findByJourneyId(UUID journeyId);
}
