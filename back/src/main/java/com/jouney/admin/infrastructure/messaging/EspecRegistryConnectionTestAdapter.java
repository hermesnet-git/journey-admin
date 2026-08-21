package com.jouney.admin.infrastructure.messaging;

import com.jouney.admin.application.messaging.ConnectionTestResult;
import com.jouney.admin.application.messaging.MessagingConnectionTestPort;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Chamada real de saída pro ms-espec-registry, o único componente que resolve credencial e abre
 * conexão de verdade com o broker (REQ-14.04.003) — o admin-back só repassa a solicitação.
 */
@Component
public class EspecRegistryConnectionTestAdapter implements MessagingConnectionTestPort {

    private final RestClient restClient;
    private final String baseUrl;

    public EspecRegistryConnectionTestAdapter(@Value("${app.espec-registry.base-url}") String baseUrl) {
        this.baseUrl = baseUrl;
        this.restClient = RestClient.create();
    }

    @Override
    public ConnectionTestResult test(String clusterType, String connectionAddress, String credentialReferenceName) {
        try {
            ConnectionTestResponseBody response = restClient.post()
                    .uri(baseUrl + "/api/v1/connection-tests")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(new ConnectionTestRequestBody(clusterType, connectionAddress, credentialReferenceName))
                    .retrieve()
                    .body(ConnectionTestResponseBody.class);
            return new ConnectionTestResult(response.ok(), response.message());
        } catch (RestClientException e) {
            throw new MessagingConnectionTestException(
                    "Failed to reach espec-registry connection test API at " + baseUrl, e);
        }
    }

    private record ConnectionTestRequestBody(String clusterType, String connectionAddress, String credentialReferenceName) {
    }

    private record ConnectionTestResponseBody(boolean ok, String message) {
    }
}
