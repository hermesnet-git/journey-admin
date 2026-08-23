package com.jouney.admin.infrastructure.publication;

import com.jouney.admin.application.publication.RuntimePublicationPort;
import com.jouney.admin.domain.publication.Publication;
import com.jouney.admin.infrastructure.persistence.publication.PublicationSnapshotRecord;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Real outbound call to the runtime's publication API. The Admin Portal has no knowledge of
 * what implements that API (which runtime engine, a queue, etc.) — it only knows the
 * contract: send the journey snapshot, get success or failure back. Replaces the EP-02.09
 * mock: failures now propagate as {@link RuntimePublicationException} instead of always
 * "succeeding".
 */
@Component
public class PublicationAdapter implements RuntimePublicationPort {

    private static final Logger log = LoggerFactory.getLogger(PublicationAdapter.class);

    private final RestClient restClient;
    private final String baseUrl;
    private final ObjectMapper objectMapper;

    public PublicationAdapter(@Value("${app.transform-publication.base-url}") String baseUrl, ObjectMapper objectMapper) {
        this.baseUrl = baseUrl;
        this.restClient = RestClient.create();
        this.objectMapper = objectMapper;
    }

    @Override
    public void publish(Publication snapshot) {
        PublicationSnapshotRecord record = PublicationSnapshotRecord.from(snapshot);

        try {
            restClient.post()
                    .uri(baseUrl + "/api/v1/publications")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(record)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Published journey={} to runtime publication API at {}", snapshot.getJourneyId(), baseUrl);
        } catch (RestClientResponseException e) {
            // ms-transform-publication's error body is always {"code":...,"message":"<one clean
            // sentence>",...} regardless of which case it is — Camunda unreachable, Camunda rejecting
            // the deploy, or anything else its own handler catches (see its GlobalExceptionHandler).
            // Pulling just that field out, instead of dumping the whole body, is what keeps the user
            // from seeing that envelope (and whatever it re-wrapped one hop further down) as raw JSON.
            String cause = extractMessage(e, e.getStatusCode().value() + " " + e.getStatusText());
            // 422 specifically means it reached Camunda and Camunda rejected the deploy (e.g. an
            // invalid JUEL expression in the journey itself) — the runtime API is up, this journey
            // just isn't deployable as-is. Anything else (502 unreachable, 500 unexpected, ...) is a
            // real availability/infra problem.
            if (e.getStatusCode().value() == HttpStatus.UNPROCESSABLE_ENTITY.value()) {
                throw new RuntimePublicationRejectedException(cause, e);
            }
            throw new RuntimePublicationException(
                    "Failed to publish journey " + snapshot.getJourneyId() + " to runtime publication API at "
                            + baseUrl + ": " + cause,
                    e);
        } catch (RestClientException e) {
            throw new RuntimePublicationException(
                    "Failed to publish journey " + snapshot.getJourneyId() + " to runtime publication API at "
                            + baseUrl + ": " + e.getMessage(),
                    e);
        }
    }

    // Falls back to a short status-only label when the body isn't the JSON shape expected (e.g. an
    // HTML error page from something other than ms-transform-publication's own handler).
    private String extractMessage(RestClientResponseException e, String fallback) {
        String body = e.getResponseBodyAsString();
        if (body != null && !body.isBlank()) {
            try {
                JsonNode node = objectMapper.readTree(body);
                JsonNode message = node.get("message");
                if (message != null && message.isString() && !message.asString().isBlank()) {
                    return message.asString();
                }
            } catch (Exception ignored) {
                // Body isn't the JSON shape we expect — fall through to the fallback.
            }
        }
        return fallback;
    }

    @Override
    public void unpublish(UUID journeyId) {
        try {
            restClient.delete()
                    .uri(baseUrl + "/api/v1/publications/{journeyId}", journeyId)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Unpublished journey={} from runtime publication API at {}", journeyId, baseUrl);
        } catch (RestClientException e) {
            throw new RuntimePublicationException(
                    "Failed to unpublish journey " + journeyId + " from runtime publication API at " + baseUrl, e);
        }
    }
}
