package com.jouney.admin.infrastructure.execution;

import com.jouney.admin.application.execution.FormResolutionPort;
import com.jouney.admin.domain.execution.ResolvedForm;
import com.jouney.admin.infrastructure.publication.TimeoutAwareRestClient;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/** Chama {@code FormSpecController} do ms-espec-registry — mesma property {@code app.espec-
 * registry.base-url} já usada pelo teste de conexão do catálogo de mensageria (FT-14) e pela
 * publicação de telas SDUI. */
@Component
public class EspecRegistryFormClient implements FormResolutionPort {

    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);
    private static final Duration READ_TIMEOUT = Duration.ofSeconds(10);

    private final RestClient restClient;
    private final String baseUrl;

    public EspecRegistryFormClient(@Value("${app.espec-registry.base-url}") String baseUrl) {
        this.baseUrl = baseUrl;
        this.restClient = TimeoutAwareRestClient.create(CONNECT_TIMEOUT, READ_TIMEOUT);
    }

    @Override
    public ResolvedForm resolveForm(UUID journeyId, int journeyVersion, String nodeId, Map<String, Object> variables) {
        try {
            return restClient.post()
                    .uri(baseUrl + "/api/v1/journeys/{jid}/versions/{version}/nodes/{nid}/form/resolve",
                            journeyId, journeyVersion, nodeId)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("variables", variables))
                    .retrieve()
                    .body(ResolvedForm.class);
        } catch (RestClientException e) {
            String detail = TimeoutAwareRestClient.isTimeout(e)
                    ? "não respondeu em até " + READ_TIMEOUT.toSeconds() + "s"
                    : e.getMessage();
            throw new FormResolutionException(
                    "Falha ao resolver a tela do nó " + nodeId + " no ms-espec-registry em " + baseUrl + ": " + detail, e);
        }
    }
}
