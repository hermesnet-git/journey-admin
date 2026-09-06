package com.jouney.especregistry.sdui;

import java.util.Optional;
import java.util.UUID;

/** Encapsula o repositório real de snapshots publicados por trás de uma interface própria —
 * hoje só o Strapi implementa (StrapiSnapshotRepository), mas o desenho permite trocar/somar outro
 * backend (ex.: AEM) no futuro sem quem consome (StepResolver/FormSpecController) precisar mudar. */
public interface SnapshotRepository {

    /** Publica uma nova revisão (imutável) e marca a revisão anterior do mesmo journeyId+screenId
     * (se existir) como deprecated — nunca edita um snapshot já publicado. */
    void save(SduiScreenEnvelope envelope);

    Optional<SduiScreenEnvelope> findLatestPublished(UUID journeyId, String screenId);
}
