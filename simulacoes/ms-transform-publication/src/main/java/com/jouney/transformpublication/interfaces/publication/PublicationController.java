package com.jouney.transformpublication.interfaces.publication;

import com.jouney.transformpublication.application.PublishJourneyToCamunda;
import com.jouney.transformpublication.application.UnpublishJourneyFromCamunda;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/publications")
public class PublicationController {

    public record PublishResponse(String processDefinitionKey, String deploymentId, String processDefinitionId) {
    }

    private final PublishJourneyToCamunda publishJourneyToCamunda;
    private final UnpublishJourneyFromCamunda unpublishJourneyFromCamunda;

    public PublicationController(PublishJourneyToCamunda publishJourneyToCamunda,
                                  UnpublishJourneyFromCamunda unpublishJourneyFromCamunda) {
        this.publishJourneyToCamunda = publishJourneyToCamunda;
        this.unpublishJourneyFromCamunda = unpublishJourneyFromCamunda;
    }

    @PostMapping
    public ResponseEntity<PublishResponse> publish(@Valid @RequestBody PublicationSnapshotRequest request) {
        PublishJourneyToCamunda.Result result = publishJourneyToCamunda.execute(request);
        return ResponseEntity.ok(
                new PublishResponse(result.processDefinitionKey(), result.deploymentId(), result.processDefinitionId()));
    }

    @DeleteMapping("/{journeyId}")
    public ResponseEntity<Void> unpublish(@PathVariable UUID journeyId) {
        unpublishJourneyFromCamunda.execute(journeyId);
        return ResponseEntity.noContent().build();
    }
}
