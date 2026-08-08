package com.jouney.admin.infrastructure.persistence.version;

import com.jouney.admin.domain.version.VersionStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface JourneyVersionJpaRepository extends JpaRepository<JourneyVersionJpaEntity, UUID> {

    List<JourneyVersionJpaEntity> findByJourneyIdOrderByVersionNumberDesc(UUID journeyId);

    Optional<JourneyVersionJpaEntity> findByJourneyIdAndStatus(UUID journeyId, VersionStatus status);

    @Query("select coalesce(max(v.versionNumber), 0) from JourneyVersionJpaEntity v where v.journeyId = :journeyId")
    int findMaxVersionNumber(UUID journeyId);
}
