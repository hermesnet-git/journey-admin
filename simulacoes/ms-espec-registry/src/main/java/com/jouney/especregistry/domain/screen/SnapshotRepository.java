package com.jouney.especregistry.domain.screen;

import java.util.Optional;
import java.util.UUID;

/** Encapsula o repositório real de telas publicadas por trás de uma interface própria —
 * hoje o Postgres implementa (PostgresSnapshotRepository, schema espec_registry), mas o desenho
 * permite trocar/somar outro backend no futuro sem quem consome (application/journey) precisar
 * mudar. */
public interface SnapshotRepository {

    /** Publica uma nova revisão (imutável) e marca a revisão anterior do mesmo journeyId+screenId
     * (se existir) como deprecated — nunca edita um snapshot já publicado. */
    void save(ScreenEnvelope envelope);

    Optional<ScreenEnvelope> findPublished(UUID journeyId, int journeyVersion, String uiStepId);

    /** Checagem rápida de que o backend está disponível pra receber publicação agora — usada pelo
     * admin/back antes de tentar publicar de verdade, pra falhar rápido com uma mensagem clara em
     * vez de só descobrir depois de já ter feito o deploy no runtime. */
    boolean isReachable();
}
