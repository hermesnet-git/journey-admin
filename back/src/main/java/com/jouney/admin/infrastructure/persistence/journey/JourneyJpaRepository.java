package com.jouney.admin.infrastructure.persistence.journey;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface JourneyJpaRepository extends JpaRepository<JourneyJpaEntity, UUID>,
        JpaSpecificationExecutor<JourneyJpaEntity> {

    long countByChannelId(UUID channelId);
}
