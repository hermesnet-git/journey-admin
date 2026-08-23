package com.jouney.admin.infrastructure.messaging;

import com.jouney.admin.application.messaging.MessagingTopicListingPort;
import com.jouney.admin.application.messaging.TopicListingResult;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Chamada real de saída pro ms-espec-registry, o único componente que abre conexão de verdade com
 * o broker — o admin-back só repassa a solicitação (mesmo padrão de
 * {@link EspecRegistryConnectionTestAdapter}).
 */
@Component
public class EspecRegistryTopicListingAdapter implements MessagingTopicListingPort {

    private final RestClient restClient;
    private final String baseUrl;

    public EspecRegistryTopicListingAdapter(@Value("${app.espec-registry.base-url}") String baseUrl) {
        this.baseUrl = baseUrl;
        this.restClient = RestClient.create();
    }

    @Override
    public TopicListingResult listTopics(String clusterType, String connectionAddress, String credentialReferenceName) {
        try {
            TopicListingResponseBody response = restClient.post()
                    .uri(baseUrl + "/api/v1/topic-listings")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(new TopicListingRequestBody(clusterType, connectionAddress, credentialReferenceName))
                    .retrieve()
                    .body(TopicListingResponseBody.class);
            return new TopicListingResult(response.ok(), response.message(), response.topics());
        } catch (RestClientException e) {
            throw new MessagingConnectionTestException(
                    "Failed to reach espec-registry topic listing API at " + baseUrl, e);
        }
    }

    private record TopicListingRequestBody(String clusterType, String connectionAddress, String credentialReferenceName) {
    }

    private record TopicListingResponseBody(boolean ok, String message, List<String> topics) {
    }
}
