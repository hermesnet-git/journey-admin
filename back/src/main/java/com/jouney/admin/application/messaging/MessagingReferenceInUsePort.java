package com.jouney.admin.application.messaging;

import java.util.Optional;
import java.util.UUID;

/**
 * Localiza a jornada publicada (se houver) cujo conector referencia um cluster/credencial do
 * catálogo (FT-14), usado para bloquear a exclusão (REQ-14.01.004/REQ-14.02.005) com uma mensagem
 * que nomeia o motivo real — mesmo princípio de {@link com.jouney.admin.application.ActivePublicationPort}
 * para produto/canal.
 */
public interface MessagingReferenceInUsePort {

    Optional<String> findPublishedJourneyNameReferencingCluster(UUID clusterId);

    Optional<String> findPublishedJourneyNameReferencingCredential(String credentialReferenceName);
}
