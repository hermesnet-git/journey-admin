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

    Optional<SduiScreenEnvelope> findPublished(UUID journeyId, int journeyVersion, String uiStepId);

    /** Checagem rápida de que o backend está disponível pra receber publicação agora — usada pelo
     * admin/back antes de tentar publicar de verdade, pra falhar rápido com uma mensagem clara em
     * vez de só descobrir depois de já ter feito o deploy no runtime. */
    boolean isReachable();
}
