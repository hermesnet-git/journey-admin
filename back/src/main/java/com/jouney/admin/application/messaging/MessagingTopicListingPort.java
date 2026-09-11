package com.jouney.admin.application.messaging;

/**
 * Listagem de tópicos (US-03.09) do cluster escolhido, pra alimentar o seletor do editor de fluxo —
 * mesma resolução de credencial do teste de conexão, ver {@link MessagingConnectionTestPort}.
 */
public interface MessagingTopicListingPort {

    TopicListingResult listTopics(String clusterType, String connectionAddress, String credentialReferenceName);
}
