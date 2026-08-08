package com.jouney.admin.domain.version;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface JourneyVersionRepository {

    JourneyVersion save(JourneyVersion version);

    Optional<JourneyVersion> findById(UUID versionId);

    List<JourneyVersion> findByJourneyId(UUID journeyId);

    Optional<JourneyVersion> findByJourneyIdAndStatus(UUID journeyId, VersionStatus status);

    int findMaxVersionNumber(UUID journeyId);
}
