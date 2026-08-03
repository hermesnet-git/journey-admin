package com.jouney.admin.infrastructure.persistence.publication;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PublicationJpaRepository extends JpaRepository<PublicationJpaEntity, UUID> {

    Optional<PublicationJpaEntity> findByJourneyId(UUID journeyId);
}
