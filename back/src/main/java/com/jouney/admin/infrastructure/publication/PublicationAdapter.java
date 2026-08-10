package com.jouney.admin.infrastructure.publication;

import com.jouney.admin.application.publication.RuntimePublicationPort;
import com.jouney.admin.domain.publication.Publication;
import com.jouney.admin.infrastructure.persistence.publication.PublicationSnapshotRecord;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Real outbound call to the runtime's publication API. The Admin Portal has no knowledge of
 * what implements that API (Camunda, another engine, a queue, etc.) — it only knows the
 * contract: send the journey snapshot, get success or failure back. Replaces the EP-02.09
 * mock: failures now propagate as {@link RuntimePublicationException} instead of always
 * "succeeding".
 */
@Component
public class PublicationAdapter implements RuntimePublicationPort {

    private static final Logger log = LoggerFactory.getLogger(PublicationAdapter.class);

    private final RestClient restClient;
    private final String baseUrl;

    public PublicationAdapter(@Value("${app.transform-publication.base-url}") String baseUrl) {
        this.baseUrl = baseUrl;
        this.restClient = RestClient.create();
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
        } catch (RestClientException e) {
            throw new RuntimePublicationException(
                    "Failed to publish journey " + snapshot.getJourneyId() + " to runtime publication API at "
                            + baseUrl,
                    e);
        }
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
