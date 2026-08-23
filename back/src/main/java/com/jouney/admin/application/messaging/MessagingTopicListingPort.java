package com.jouney.admin.application.messaging;

/**
 * Delega a listagem de tópicos (US-03.09) ao componente de runtime que de fato abre conexão com o
 * broker — o admin-back nunca acessa o Key Vault nem o broker diretamente, mesma regra do teste de
 * conexão (REQ-14.04.003).
 */
public interface MessagingTopicListingPort {

    TopicListingResult listTopics(String clusterType, String connectionAddress, String credentialReferenceName);
}
