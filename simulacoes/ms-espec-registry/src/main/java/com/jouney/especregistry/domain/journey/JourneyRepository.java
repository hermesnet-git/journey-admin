package com.jouney.especregistry.domain.journey;

import java.util.Optional;
import java.util.UUID;

/** Leitura do snapshot de jornada persistido pelo admin/back — este serviço não é dono desse dado,
 * só o consulta. Implementado em infrastructure/persistence/journey lendo direto do Postgres
 * (journey_publication/journey_version), sem HTTP: uma versão PUBLISHED é imutável (REQ-06.02.006),
 * então não há necessidade nenhuma do admin/back estar de pé pra resolver uma execução real. */
public interface JourneyRepository {

    Optional<PublicationSnapshot> findPublication(UUID journeyId);

    Optional<PublicationSnapshot> findVersion(UUID journeyId, UUID versionId);

    Optional<PublicationSnapshot> findVersion(UUID journeyId, int versionNumber);
}
