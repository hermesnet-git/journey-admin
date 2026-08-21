package com.jouney.admin.application.messaging;

import java.util.UUID;

/**
 * Checa se um cluster/credencial do catálogo (FT-14) está referenciado pelo conector de alguma
 * jornada publicada, usado para bloquear a desativação (REQ-14.01.004/REQ-14.02.005) — mesmo
 * princípio de {@link com.jouney.admin.application.ActivePublicationPort} para produto/canal.
 */
public interface MessagingReferenceInUsePort {

    boolean existsPublishedConnectorForCluster(UUID clusterId);

    boolean existsPublishedConnectorForCredential(String credentialReferenceName);
}
