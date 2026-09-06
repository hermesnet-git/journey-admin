package com.jouney.admin.infrastructure.publication;

import com.jouney.admin.application.publication.SduiScreenPublicationPort;
import com.jouney.admin.domain.flow.SduiScreenEnvelope;
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

    private final RestClient restClient;
    private final String baseUrl;

    public EspecRegistrySduiAdapter(@Value("${app.espec-registry.base-url}") String baseUrl) {
        this.baseUrl = baseUrl;
        this.restClient = RestClient.create();
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
            throw new EspecRegistrySduiException(
                    "Falha ao publicar snapshot(s) SDUI no ms-espec-registry em " + baseUrl + ": " + e.getMessage(), e);
        }
    }
}
