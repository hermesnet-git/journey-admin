package com.jouney.admin.application.messaging;

/**
 * Teste de conexão (FT-14, US-14.04) — metadado apenas (describeCluster), nunca publica/consome
 * uma mensagem real (REQ-14.04.002). A credencial em si é resolvida por
 * {@link com.jouney.admin.infrastructure.messaging.CredentialResolver}, hoje sem Key Vault real
 * (ponytail, ver {@link com.jouney.admin.infrastructure.messaging.LocalCredentialResolver}).
 */
public interface MessagingConnectionTestPort {

    ConnectionTestResult test(String clusterType, String connectionAddress, String credentialReferenceName);
}
