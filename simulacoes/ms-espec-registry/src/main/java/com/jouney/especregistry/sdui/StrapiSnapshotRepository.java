package com.jouney.especregistry.sdui;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import com.jouney.especregistry.config.StrapiProperties;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Única implementação de {@link SnapshotRepository} hoje — grava/lê snapshots publicados no
 * content-type {@code sdui-snapshot} do Strapi ({@code admin/simulacoes/strapi-sdui-registry}).
 *
 * NÃO TESTADO CONTRA UM STRAPI REAL: não existe ainda um token de API gerado (STRAPI_API_TOKEN),
 * então esta classe nunca rodou fim a fim. A forma da requisição/resposta segue a convenção REST
 * padrão do Strapi ({@code {"data": {...}}} na escrita, filtros {@code filters[campo][$eq]} na
 * leitura) — mas a leitura tenta tanto o formato "achatado" (Strapi v5, campos direto em cada linha
 * de {@code data}) quanto o antigo {@code attributes} (Strapi v4), defensivamente, já que a versão
 * exata instalada localmente não foi confirmada. Ajustar aqui se o formato real divergir ao testar.
 */
@Component
public class StrapiSnapshotRepository implements SnapshotRepository {

    private static final String COLLECTION_PATH = "/api/sdui-snapshots";

    private final RestClient restClient = RestClient.create();
    private final StrapiProperties properties;
    private final ObjectMapper objectMapper;

    public StrapiSnapshotRepository(StrapiProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    @Override
    public void save(SduiScreenEnvelope envelope) {
        String token = requireToken();
        findLatestEntry(envelope.journeyId(), envelope.screenId())
                .ifPresent(entry -> deprecate(entry.strapiId(), token));

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("journeyId", envelope.journeyId().toString());
        data.put("screenId", envelope.screenId());
        data.put("revision", envelope.revision());
        data.put("status", "published");
        data.put("schemaVersion", envelope.schemaVersion());
        data.put("catalogVersion", envelope.catalogVersion());
        data.put("publishedAt_source", (envelope.publishedAt() != null ? envelope.publishedAt() : OffsetDateTime.now()).toString());
        data.put("integrityHash", integrityHash(envelope.root()));
        data.put("supportedTargets", envelope.supportedTargets());
        data.put("minRendererVersion", envelope.minRendererVersion());
        data.put("root", envelope.root());

        try {
            restClient.post().uri(properties.baseUrl() + COLLECTION_PATH)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("data", data))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException e) {
            throw new StrapiSnapshotException("Falha ao publicar snapshot SDUI no Strapi para "
                    + envelope.journeyId() + "/" + envelope.screenId(), e);
        }
    }

    @Override
    public Optional<SduiScreenEnvelope> findLatestPublished(UUID journeyId, String screenId) {
        return findLatestEntry(journeyId, screenId).map(StrapiEntry::envelope);
    }

    private record StrapiEntry(long strapiId, SduiScreenEnvelope envelope) {
    }

    private Optional<StrapiEntry> findLatestEntry(UUID journeyId, String screenId) {
        String token = requireToken();
        String uri = properties.baseUrl() + COLLECTION_PATH
                + "?filters[journeyId][$eq]=" + journeyId
                + "&filters[screenId][$eq]=" + screenId
                + "&filters[status][$eq]=published"
                + "&sort[0]=revision:desc&pagination[limit]=1";
        JsonNode response;
        try {
            response = restClient.get().uri(uri)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .retrieve()
                    .body(JsonNode.class);
        } catch (RestClientException e) {
            throw new StrapiSnapshotException("Falha ao consultar snapshot SDUI no Strapi para "
                    + journeyId + "/" + screenId, e);
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
        long strapiId = row.path("id").asLong();
        try {
            SduiScreenEnvelope envelope = new SduiScreenEnvelope(
                    textOrNull(fields, "schemaVersion"), textOrNull(fields, "catalogVersion"), journeyId, screenId,
                    fields.path("revision").asInt(),
                    textOrNull(fields, "status"),
                    OffsetDateTime.parse(fields.path("publishedAt_source").asText()),
                    objectMapper.convertValue(fields.path("supportedTargets"), objectMapper.getTypeFactory()
                            .constructCollectionType(java.util.List.class, String.class)),
                    objectMapper.convertValue(fields.path("minRendererVersion"), objectMapper.getTypeFactory()
                            .constructMapType(Map.class, String.class, String.class)),
                    objectMapper.treeToValue(fields.path("root"), SduiNode.class));
            return Optional.of(new StrapiEntry(strapiId, envelope));
        } catch (Exception e) {
            throw new StrapiSnapshotException("Snapshot SDUI do Strapi em formato inesperado para "
                    + journeyId + "/" + screenId, e);
        }
    }

    private void deprecate(long strapiId, String token) {
        try {
            restClient.put().uri(properties.baseUrl() + COLLECTION_PATH + "/" + strapiId)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("data", Map.of("status", "deprecated")))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException e) {
            throw new StrapiSnapshotException("Falha ao depreciar revisão anterior (id " + strapiId + ") no Strapi", e);
        }
    }

    private static String textOrNull(JsonNode node, String field) {
        JsonNode value = node.path(field);
        return value.isMissingNode() || value.isNull() ? null : value.asText();
    }

    private String integrityHash(SduiNode root) {
        try {
            byte[] json = objectMapper.writeValueAsBytes(root);
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
