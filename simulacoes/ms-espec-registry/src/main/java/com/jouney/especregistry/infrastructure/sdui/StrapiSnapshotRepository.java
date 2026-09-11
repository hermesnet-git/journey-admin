package com.jouney.especregistry.infrastructure.sdui;

import com.jouney.especregistry.domain.sdui.ScreenEnvelope;
import com.jouney.especregistry.domain.sdui.SnapshotRepository;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import com.jouney.especregistry.config.StrapiProperties;
import java.net.SocketTimeoutException;
import java.net.http.HttpClient;
import java.net.http.HttpTimeoutException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Única implementação de {@link SnapshotRepository} hoje — grava/lê snapshots publicados no
 * content-type {@code sdui-snapshot} do Strapi ({@code admin/simulacoes/strapi-sdui-registry}).
 *
 * Testado fim a fim contra um Strapi v5.52.3 real (2026-09-06): a forma da requisição/resposta
 * segue a convenção REST do Strapi ({@code {"data": {...}}} na escrita, filtros
 * {@code filters[campo][$eq]} na leitura), com um detalhe confirmado do v5 — update/delete usam o
 * {@code documentId} (string) na URL, não o {@code id} numérico interno (esse ainda existe na
 * resposta, mas não serve pra rota de update). A leitura ainda tenta os dois formatos de campo
 * ("achatado" do v5, ou aninhado em {@code attributes} do v4) defensivamente.
 */
@Component
public class StrapiSnapshotRepository implements SnapshotRepository {

    private static final String COLLECTION_PATH = "/api/sdui-snapshots";
    private static final Duration READ_TIMEOUT = Duration.ofSeconds(10);
    // Bem mais curto que o READ_TIMEOUT do save/find de verdade — isReachable() só serve pra
    // responder rápido pro healthcheck do admin/back, não faz sentido esperar 10s por isso.
    private static final Duration HEALTH_CHECK_TIMEOUT = Duration.ofSeconds(3);

    // Sem isso, um Strapi que aceita a conexão mas nunca responde (visto na prática: processo
    // travado, sem crashar) trava a requisição inteira do publish pra sempre — RestClient.create()
    // usa o HttpClient do JDK, que não tem read timeout default nenhum.
    private final RestClient restClient = RestClient.builder()
            .requestFactory(timeoutFactory(Duration.ofSeconds(5), READ_TIMEOUT)).build();
    private final RestClient healthCheckClient = RestClient.builder()
            .requestFactory(timeoutFactory(Duration.ofSeconds(2), HEALTH_CHECK_TIMEOUT)).build();
    private final StrapiProperties properties;
    private final ObjectMapper objectMapper;

    private static JdkClientHttpRequestFactory timeoutFactory(Duration connectTimeout, Duration readTimeout) {
        // Causa raiz real do travamento (confirmada isolando cada variante da query): o HttpClient
        // do JDK tenta negociar upgrade HTTP/2 (h2c) por padrão mesmo em conexão sem TLS — o
        // Koa/Node do Strapi não suporta esse upgrade e a negociação trava a conexão inteira, sem
        // erro nenhum. Forçar HTTP/1.1 explicitamente resolve (mesma requisição volta em ~10ms em
        // vez de travar até o timeout).
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(
                HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).connectTimeout(connectTimeout).build());
        factory.setReadTimeout(readTimeout);
        return factory;
    }

    // Distingue um timeout (Strapi aceitou a conexão mas nunca respondeu) de qualquer outro erro de
    // rede — sem isso a mensagem mostrada ao usuário é só o texto genérico do RestClientException
    // ("I/O error on GET request..."), sem dizer que o problema foi especificamente o tempo limite.
    private static String describeFailure(RestClientException e) {
        for (Throwable current = e; current != null; current = current.getCause()) {
            if (current instanceof HttpTimeoutException || current instanceof SocketTimeoutException) {
                return "não respondeu em até " + READ_TIMEOUT.toSeconds() + "s";
            }
        }
        return e.getMessage();
    }

    public StrapiSnapshotRepository(StrapiProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    @Override
    public void save(ScreenEnvelope envelope) {
        String token = requireToken();

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("journeyId", envelope.journeyId().toString());
        data.put("journeyVersion", envelope.journeyVersion());
        data.put("uiStepId", envelope.uiStepId());
        data.put("status", "published");
        data.put("schemaVersion", envelope.schemaVersion());
        data.put("catalogVersion", envelope.catalogVersion());
        data.put("publishedAt_source", (envelope.publishedAt() != null ? envelope.publishedAt() : OffsetDateTime.now()).toString());
        data.put("integrityHash", integrityHash(envelope.data()));
        data.put("supportedTargets", envelope.supportedTargets());
        data.put("minRendererVersion", envelope.minRendererVersion());
        data.put("dataSources", envelope.dataSources());
        data.put("data", envelope.data());

        try {
            restClient.post().uri(properties.baseUrl() + COLLECTION_PATH)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("data", data))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException e) {
            throw new StrapiSnapshotException("Falha ao publicar snapshot SDUI no Strapi para "
                    + envelope.journeyId() + "/" + envelope.journeyVersion() + "/" + envelope.uiStepId()
                    + ": " + describeFailure(e), e);
        }
    }

    @Override
    public Optional<ScreenEnvelope> findPublished(UUID journeyId, int journeyVersion, String uiStepId) {
        return findEntry(journeyId, journeyVersion, uiStepId).map(StrapiEntry::envelope);
    }

    @Override
    public boolean isReachable() {
        String token = properties.apiToken();
        if (token == null || token.isBlank()) {
            return false;
        }
        try {
            healthCheckClient.get().uri(properties.baseUrl() + COLLECTION_PATH + "?pagination[limit]=1")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .retrieve()
                    .toBodilessEntity();
            return true;
        } catch (RestClientException e) {
            return false;
        }
    }

    // Strapi v5 troca o id numérico interno (formato v4) por um documentId (string).
    private record StrapiEntry(String documentId, ScreenEnvelope envelope) {
    }

    private Optional<StrapiEntry> findEntry(UUID journeyId, int journeyVersion, String uiStepId) {
        String token = requireToken();
        String uri = properties.baseUrl() + COLLECTION_PATH
                + "?filters[journeyId][$eq]=" + journeyId
                + "&filters[journeyVersion][$eq]=" + journeyVersion
                + "&filters[uiStepId][$eq]=" + uiStepId
                + "&filters[status][$eq]=published"
                + "&pagination[limit]=1";
        JsonNode response;
        try {
            response = restClient.get().uri(uri)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .retrieve()
                    .body(JsonNode.class);
        } catch (RestClientException e) {
            throw new StrapiSnapshotException("Falha ao consultar snapshot SDUI no Strapi para "
                    + journeyId + "/" + journeyVersion + "/" + uiStepId + ": " + describeFailure(e), e);
        }
        if (response == null) {
            return Optional.empty();
        }
        JsonNode dataArray = response.path("data");
        if (!dataArray.isArray() || dataArray.isEmpty()) {
            return Optional.empty();
        }
        JsonNode row = dataArray.get(0);
        JsonNode fields = row.has("attributes") ? row.path("attributes") : row;
        String documentId = textOrNull(row, "documentId");
        if (documentId == null) {
            throw new StrapiSnapshotException("Snapshot SDUI do Strapi sem documentId para "
                    + journeyId + "/" + journeyVersion + "/" + uiStepId + " — formato de resposta inesperado.");
        }
        try {
            ScreenEnvelope envelope = new ScreenEnvelope(
                    textOrNull(fields, "schemaVersion"), textOrNull(fields, "catalogVersion"), journeyId,
                    fields.path("journeyVersion").asInt(), textOrNull(fields, "uiStepId"),
                    textOrNull(fields, "status"),
                    OffsetDateTime.parse(fields.path("publishedAt_source").asText()),
                    objectMapper.convertValue(fields.path("supportedTargets"), objectMapper.getTypeFactory()
                            .constructCollectionType(java.util.List.class, String.class)),
                    objectMapper.convertValue(fields.path("minRendererVersion"), objectMapper.getTypeFactory()
                            .constructMapType(Map.class, String.class, String.class)),
                    objectMapper.convertValue(fields.path("dataSources"), objectMapper.getTypeFactory()
                            .constructMapType(Map.class, String.class, Object.class)), fields.path("data"));
            return Optional.of(new StrapiEntry(documentId, envelope));
        } catch (Exception e) {
            throw new StrapiSnapshotException("Snapshot SDUI do Strapi em formato inesperado para "
                    + journeyId + "/" + journeyVersion + "/" + uiStepId, e);
        }
    }

    private static String textOrNull(JsonNode node, String field) {
        JsonNode value = node.path(field);
        return value.isMissingNode() || value.isNull() ? null : value.asText();
    }

    private String integrityHash(JsonNode data) {
        try {
            byte[] json = objectMapper.writeValueAsBytes(data);
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(json);
            StringBuilder hex = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException | RuntimeException e) {
            throw new StrapiSnapshotException("Falha ao calcular hash de integridade do snapshot", e);
        }
    }

    private String requireToken() {
        String token = properties.apiToken();
        if (token == null || token.isBlank()) {
            throw new StrapiSnapshotException("Token de API do Strapi não configurado (env var STRAPI_API_TOKEN) — "
                    + "gere em Settings > API Tokens no admin do Strapi, com permissão de leitura e escrita em sdui-snapshot.");
        }
        return token;
    }
}
