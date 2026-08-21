package com.jouney.admin.application.messaging;

/**
 * Delega o teste de conexão (FT-14, US-14.04) ao componente de runtime que de fato resolve
 * credencial e abre conexão com o broker — o admin-back nunca acessa o Key Vault nem o broker
 * diretamente (REQ-14.04.003).
 */
public interface MessagingConnectionTestPort {

    ConnectionTestResult test(String clusterType, String connectionAddress, String credentialReferenceName);
}
