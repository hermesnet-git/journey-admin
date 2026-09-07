package com.jouney.admin.infrastructure.publication;

import com.jouney.admin.application.publication.SduiScreenPublicationPort;
import com.jouney.admin.domain.flow.SduiScreenEnvelope;
import java.time.Duration;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/** POST dos envelopes de tela (uma User Task com embeddedScreenRoot = um envelope) pro
 * ms-espec-registry, que grava no Strapi — mesmo padrão de {@link PublicationAdapter}
 * (RestClient, base-url via @Value). Reaproveita a mesma property {@code app.espec-registry.base-
 * url} já usada pelo teste de conexão do catálogo de mensageria (FT-14). */
@Component
public class EspecRegistrySduiAdapter implements SduiScreenPublicationPort {

    private static final Logger log = LoggerFactory.getLogger(EspecRegistrySduiAdapter.class);
    private static final Duration READ_TIMEOUT = Duration.ofSeconds(10);
    // Bem mais curto que o READ_TIMEOUT do publish de verdade — isAvailable() só serve pra falhar
    // rápido antes de tentar publicar, não faz sentido esperar 10s só pra saber se dá pra tentar.
    private static final Duration HEALTH_CHECK_TIMEOUT = Duration.ofSeconds(3);

    private final RestClient restClient;
    private final RestClient healthCheckClient;
    private final String baseUrl;

    public EspecRegistrySduiAdapter(@Value("${app.espec-registry.base-url}") String baseUrl) {
        this.baseUrl = baseUrl;
        this.restClient = TimeoutAwareRestClient.create(Duration.ofSeconds(5), READ_TIMEOUT);
        this.healthCheckClient = TimeoutAwareRestClient.create(Duration.ofSeconds(2), HEALTH_CHECK_TIMEOUT);
    }

    @Override
    public boolean isAvailable() {
        try {
            healthCheckClient.get().uri(baseUrl + "/api/v1/sdui-snapshots/health").retrieve().toBodilessEntity();
            return true;
        } catch (RestClientException e) {
            log.warn("ms-espec-registry SDUI health check failed at {}: {}", baseUrl, e.getMessage());
            return false;
        }
    }

    @Override
    public void publish(List<SduiScreenEnvelope> envelopes) {
        if (envelopes.isEmpty()) {
            return;
        }
        try {
            restClient.post()
                    .uri(baseUrl + "/api/v1/sdui-snapshots")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(envelopes)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Published {} tela(s) SDUI ao ms-espec-registry em {}", envelopes.size(), baseUrl);
        } catch (RestClientException e) {
            String detail = TimeoutAwareRestClient.isTimeout(e)
                    ? "não respondeu em até " + READ_TIMEOUT.toSeconds() + "s"
                    : e.getMessage();
            throw new EspecRegistrySduiException(
                    "Falha ao publicar snapshot(s) SDUI no ms-espec-registry em " + baseUrl + ": " + detail, e);
        }
    }
}
