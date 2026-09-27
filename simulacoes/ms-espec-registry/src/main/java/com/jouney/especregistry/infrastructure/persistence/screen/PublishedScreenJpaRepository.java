package com.jouney.especregistry.infrastructure.persistence.screen;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PublishedScreenJpaRepository extends JpaRepository<PublishedScreenJpaEntity, UUID> {

    @Query("select e from PublishedScreenJpaEntity e where e.journeyId = :journeyId "
            + "and e.journeyVersion = :journeyVersion and e.uiStepId = :uiStepId and e.status = 'published'")
    Optional<PublishedScreenJpaEntity> findPublished(@Param("journeyId") UUID journeyId,
                                                     @Param("journeyVersion") int journeyVersion,
                                                     @Param("uiStepId") String uiStepId);

    @Modifying
    @Query("update PublishedScreenJpaEntity e set e.status = 'deprecated' where e.journeyId = :journeyId "
            + "and e.journeyVersion = :journeyVersion and e.uiStepId = :uiStepId and e.status = 'published'")
    int deprecatePublished(@Param("journeyId") UUID journeyId, @Param("journeyVersion") int journeyVersion,
                           @Param("uiStepId") String uiStepId);
}
