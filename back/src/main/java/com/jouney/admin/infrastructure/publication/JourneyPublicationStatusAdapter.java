package com.jouney.admin.infrastructure.publication;

import com.jouney.admin.application.ActivePublicationPort;
import com.jouney.admin.application.HasEverBeenPublishedPort;
import com.jouney.admin.domain.journey.JourneyRepository;
import com.jouney.admin.domain.journey.JourneyStatus;
import com.jouney.admin.domain.publication.PublicationRepository;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class JourneyPublicationStatusAdapter implements ActivePublicationPort, HasEverBeenPublishedPort {

    private final JourneyRepository journeyRepository;
    private final PublicationRepository publicationRepository;

    public JourneyPublicationStatusAdapter(JourneyRepository journeyRepository,
                                            PublicationRepository publicationRepository) {
        this.journeyRepository = journeyRepository;
        this.publicationRepository = publicationRepository;
    }

    @Override
    public boolean existsForProduct(UUID productId) {
        return journeyRepository.search(productId, null, null, null, null).stream()
                .anyMatch(j -> j.getStatus() == JourneyStatus.PUBLISHED);
    }

    @Override
    public boolean existsForChannel(UUID channelId) {
        return journeyRepository.search(null, channelId, null, null, null).stream()
                .anyMatch(j -> j.getStatus() == JourneyStatus.PUBLISHED);
    }

    @Override
    public boolean existsForJourney(UUID journeyId) {
        return journeyRepository.findById(journeyId)
                .map(j -> j.getStatus() == JourneyStatus.PUBLISHED)
                .orElse(false);
    }

    @Override
    public boolean hasEverBeenPublished(UUID journeyId) {
        return publicationRepository.findByJourneyId(journeyId).isPresent();
    }
}
