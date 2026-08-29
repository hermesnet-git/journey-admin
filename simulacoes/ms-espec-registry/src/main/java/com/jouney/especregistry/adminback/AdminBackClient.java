package com.jouney.especregistry.adminback;

import com.jouney.especregistry.config.AdminBackProperties;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

/**
 * Autentica no admin/back com credenciais de serviço (mesmo mock admin/admin usado no resto do
 * projeto) e busca as jornadas publicadas e o snapshot de publicação de cada uma — a única
 * enriquecimento que o simulador precisa além da própria API do Camunda: saber qual formulário
 * (já em SDUI) corresponde à User Task atual.
 */
@Component
public class AdminBackClient {

    private final RestClient restClient;
    private final AdminBackProperties properties;
    private volatile String token;

    public AdminBackClient(AdminBackProperties properties) {
        this.properties = properties;
        this.restClient = RestClient.create();
    }

    public List<JourneySummary> listPublishedJourneys() {
        return get("/api/v1/journeys?status=PUBLISHED", new ParameterizedTypeReference<List<JourneySummary>>() {
        });
    }

    public PublicationSnapshot getPublicationSnapshot(UUID journeyId) {
        return get("/api/v1/journeys/" + journeyId + "/publication", PublicationSnapshot.class);
    }

    public List<JourneyVersionResponse> listVersions(UUID journeyId) {
        return get("/api/v1/journeys/" + journeyId + "/versions", new ParameterizedTypeReference<List<JourneyVersionResponse>>() {
        });
    }

    /** Snapshot de uma versão específica (imutável, sobrevive a republish) — remonta o resultado num
     * {@link PublicationSnapshot} normal pra tudo que já usa esse tipo (FlowBundle.from, findNode
     * etc.) funcionar sem mudança nenhuma, seja o snapshot atual ou um antigo. */
    public PublicationSnapshot getVersionSnapshot(UUID journeyId, UUID versionId) {
        JourneyVersionResponse version = get("/api/v1/journeys/" + journeyId + "/versions/" + versionId,
                JourneyVersionResponse.class);
        JourneyVersionResponse.VersionSnapshot snapshot = version.snapshot();
        return new PublicationSnapshot(journeyId, snapshot.journeyName(), snapshot.channelType(),
                snapshot.flowNodes(), snapshot.flowConnections());
    }

    private <T> T get(String path, Class<T> type) {
        return withAuth(headers -> restClient.get().uri(properties.baseUrl() + path).headers(headers).retrieve()
                .body(type));
    }

    private <T> T get(String path, ParameterizedTypeReference<T> type) {
        return withAuth(headers -> restClient.get().uri(properties.baseUrl() + path).headers(headers).retrieve()
                .body(type));
    }

    private <T> T withAuth(Function<java.util.function.Consumer<HttpHeaders>, T> call) {
        ensureToken();
        try {
            return call.apply(this::setAuthHeader);
        } catch (HttpClientErrorException.Unauthorized e) {
            login();
            return call.apply(this::setAuthHeader);
        }
    }

    private void setAuthHeader(HttpHeaders headers) {
        headers.setBearerAuth(token);
    }

    private synchronized void ensureToken() {
        if (token == null) {
            login();
        }
    }

    private synchronized void login() {
        Map<String, Object> response = restClient.post()
                .uri(properties.baseUrl() + "/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("username", properties.serviceUsername(), "password", properties.servicePassword()))
                .retrieve()
                .body(new ParameterizedTypeReference<Map<String, Object>>() {
                });
        token = String.valueOf(response.get("token"));
    }
}
