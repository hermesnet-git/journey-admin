package com.jouney.admin.application.journey;

import com.jouney.admin.application.ActivePublicationPort;
import com.jouney.admin.application.HasEverBeenPublishedPort;
import com.jouney.admin.domain.ActivePublicationExistsException;
import com.jouney.admin.domain.flow.FlowRepository;
import com.jouney.admin.domain.journey.Journey;
import com.jouney.admin.domain.journey.JourneyInactiveException;
import com.jouney.admin.domain.journey.JourneyNotFoundException;
import com.jouney.admin.domain.journey.JourneyRepository;
import com.jouney.admin.domain.journey.JourneyStatus;
import com.jouney.admin.domain.version.JourneyVersion;
import com.jouney.admin.domain.version.JourneyVersionRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Deletes a journey (REQ-02.01.004/005/006/009). Already-INACTIVE journeys can't be deleted again.
 * A journey with no publication history is removed
 * physically, along with its versions and flow (nothing worth keeping — it never went further than
 * a DRAFT). A journey that has ever been published can't be removed physically: if it's currently
 * PUBLISHED, deletion is blocked outright (same guard as {@link DeactivateJourney}); otherwise it's
 * soft-deleted instead — the journey and every one of its versions are marked
 * INACTIVE/{@link com.jouney.admin.domain.version.VersionStatus#INACTIVE}, preserving the
 * publication trail.
 */
@Service
public class DeleteJourney {

    private final JourneyRepository journeyRepository;
    private final JourneyVersionRepository journeyVersionRepository;
    private final FlowRepository flowRepository;
    private final ActivePublicationPort activePublicationPort;
    private final HasEverBeenPublishedPort hasEverBeenPublishedPort;

    public DeleteJourney(JourneyRepository journeyRepository, JourneyVersionRepository journeyVersionRepository,
                          FlowRepository flowRepository, ActivePublicationPort activePublicationPort,
                          HasEverBeenPublishedPort hasEverBeenPublishedPort) {
        this.journeyRepository = journeyRepository;
        this.journeyVersionRepository = journeyVersionRepository;
        this.flowRepository = flowRepository;
        this.activePublicationPort = activePublicationPort;
        this.hasEverBeenPublishedPort = hasEverBeenPublishedPort;
    }

    @Transactional
    public void execute(UUID id) {
        Journey journey = journeyRepository.findById(id).orElseThrow(() -> new JourneyNotFoundException(id));

        if (journey.getStatus() == JourneyStatus.INACTIVE) {
            throw new JourneyInactiveException(id);
        }

        if (activePublicationPort.existsForJourney(id)) {
            throw new ActivePublicationExistsException("Cannot delete a currently published journey: " + id);
        }

        if (hasEverBeenPublishedPort.hasEverBeenPublished(id)) {
            journey.deactivate();
            journeyRepository.save(journey);
            for (JourneyVersion version : journeyVersionRepository.findByJourneyId(id)) {
                version.deactivate();
                journeyVersionRepository.save(version);
            }
            return;
        }

        for (JourneyVersion version : journeyVersionRepository.findByJourneyId(id)) {
            journeyVersionRepository.deleteById(version.getId());
        }
        flowRepository.deleteByJourneyId(id);
        journeyRepository.deleteById(id);
    }
}
