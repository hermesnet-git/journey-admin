package com.jouney.especregistry.infrastructure.persistence.journey;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JourneyVersionJpaRepository extends JpaRepository<JourneyVersionJpaEntity, UUID> {

    Optional<JourneyVersionJpaEntity> findByJourneyIdAndVersionNumber(UUID journeyId, int versionNumber);
}
