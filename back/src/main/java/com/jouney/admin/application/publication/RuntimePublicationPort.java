package com.jouney.admin.application.publication;

import com.jouney.admin.domain.publication.Publication;
import java.util.UUID;

/**
 * Outbound call to the runtime's publication API (EP-07). In the MVP this is mocked
 * and always succeeds; a real implementation would perform an HTTP call here.
 */
public interface RuntimePublicationPort {

    /** @return o id do deployment do runtime gerado por este publish — guardado por versão pra um
     * unpublish futuro conseguir mirar só nele (ver {@link #unpublish(UUID, String)}). */
    String publish(Publication snapshot);

    /** Despublica só o deployment específico informado, sem afetar outras versões da mesma
     * jornada que possam também estar publicadas. */
    void unpublish(UUID journeyId, String runtimeDeploymentId);
}
