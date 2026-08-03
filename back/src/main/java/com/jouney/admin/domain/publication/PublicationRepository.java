package com.jouney.admin.domain.publication;

import java.util.Optional;
import java.util.UUID;

public interface PublicationRepository {

    Publication save(Publication publication);

    Optional<Publication> findByJourneyId(UUID journeyId);
}
