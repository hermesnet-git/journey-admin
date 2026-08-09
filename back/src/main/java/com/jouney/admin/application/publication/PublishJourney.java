package com.jouney.admin.application.publication;

import com.jouney.admin.application.version.CreateJourneyVersion;
import com.jouney.admin.application.version.PublishJourneyVersion;
import com.jouney.admin.domain.auth.AuthenticatedUser;
import com.jouney.admin.domain.version.JourneyVersion;
import java.util.UUID;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

/**
 * Journey-level "Publicar" shortcut: makes sure the journey's current DRAFT version reflects its
 * live flow/forms — {@link CreateJourneyVersion} updates it in place, or creates one if none
 * exists — and publishes that version, so every publication is always backed by a
 * {@link JourneyVersion} (REQ-06.04) — the same guarantee {@code PublishJourneyVersion} gives the
 * per-version flow reachable from the journeys grid. This used to write directly to
 * journey_publication with no version_id, which violates the table's not-null constraint on that
 * column.
 */
@Service
public class PublishJourney {

    private final CreateJourneyVersion createJourneyVersion;
    private final PublishJourneyVersion publishJourneyVersion;

    public PublishJourney(CreateJourneyVersion createJourneyVersion, PublishJourneyVersion publishJourneyVersion) {
        this.createJourneyVersion = createJourneyVersion;
        this.publishJourneyVersion = publishJourneyVersion;
    }

    public void execute(UUID journeyId) {
        UUID actorId = currentUserId();
        JourneyVersion draft = createJourneyVersion.execute(journeyId, null, actorId);
        publishJourneyVersion.execute(journeyId, draft.getId());
    }

    private UUID currentUserId() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof AuthenticatedUser user) {
            return user.userId();
        }
        return null;
    }
}
