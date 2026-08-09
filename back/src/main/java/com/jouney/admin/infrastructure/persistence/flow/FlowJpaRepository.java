package com.jouney.admin.infrastructure.persistence.flow;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FlowJpaRepository extends JpaRepository<FlowJpaEntity, String> {

    Optional<FlowJpaEntity> findByJourneyId(UUID journeyId);

    void deleteByJourneyId(UUID journeyId);
}
