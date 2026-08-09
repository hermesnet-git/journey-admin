package com.jouney.admin.application.flow;

import com.jouney.admin.application.version.CreateJourneyVersion;
import com.jouney.admin.domain.auth.AuthenticatedUser;
import com.jouney.admin.domain.flow.Flow;
import com.jouney.admin.domain.flow.FlowConnection;
import com.jouney.admin.domain.flow.FlowNode;
import com.jouney.admin.domain.flow.FlowRepository;
import com.jouney.admin.domain.journey.JourneyNotFoundException;
import com.jouney.admin.domain.journey.JourneyRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

/**
 * Updates a journey's live flow, then keeps the current DRAFT version in sync with it
 * (REQ-06.02.009) via {@link CreateJourneyVersion}: updates that DRAFT's snapshot in place, or
 * creates one if none exists (typically right after a publish). PUBLISHED/ARCHIVED versions are
 * never touched here — only DRAFT is ever replaced (REQ-06.02.006).
 */
@Service
public class UpdateFlow {

    private final FlowRepository flowRepository;
    private final JourneyRepository journeyRepository;
    private final CreateJourneyVersion createJourneyVersion;

    public UpdateFlow(FlowRepository flowRepository, JourneyRepository journeyRepository,
                       CreateJourneyVersion createJourneyVersion) {
        this.flowRepository = flowRepository;
        this.journeyRepository = journeyRepository;
        this.createJourneyVersion = createJourneyVersion;
    }

    public Flow execute(UUID journeyId, String name, List<FlowNode> nodes, List<FlowConnection> connections) {
        journeyRepository.findById(journeyId).orElseThrow(() -> new JourneyNotFoundException(journeyId));
        // Every journey is born with a Flow row (Flow.initial(), see CreateJourney), so this is
        // normally an update; falling back to a fresh Flow here just makes that an upsert instead
        // of failing with a misleading "journey not found" if that row were ever missing.
        Flow flow = flowRepository.findByJourneyId(journeyId).orElseGet(() -> Flow.initial(journeyId));
        flow.replace(name, nodes, connections);
        Flow saved = flowRepository.save(flow);

        createJourneyVersion.execute(journeyId, null, currentUserId());

        return saved;
    }

    private UUID currentUserId() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof AuthenticatedUser user) {
            return user.userId();
        }
        return null;
    }
}
