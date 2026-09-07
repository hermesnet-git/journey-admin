package com.jouney.admin.domain.version;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface JourneyVersionRepository {

    JourneyVersion save(JourneyVersion version);

    Optional<JourneyVersion> findById(UUID versionId);

    List<JourneyVersion> findByJourneyId(UUID journeyId);

    // Continua Optional só porque DRAFT é a única condição de status que CreateJourneyVersion
    // ainda garante única por jornada. Qualquer status que possa ter mais de uma linha (PUBLISHED,
    // agora que publicar uma versão nova não despublica a anterior) tem que usar
    // findAllByJourneyIdAndStatus — Spring Data lança IncorrectResultSizeDataAccessException se
    // essa consulta aqui achar mais de uma linha.
    Optional<JourneyVersion> findByJourneyIdAndStatus(UUID journeyId, VersionStatus status);

    List<JourneyVersion> findAllByJourneyIdAndStatus(UUID journeyId, VersionStatus status);

    int findMaxVersionNumber(UUID journeyId);

    void deleteById(UUID versionId);
}
