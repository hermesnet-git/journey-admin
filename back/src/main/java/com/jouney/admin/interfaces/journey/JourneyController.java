package com.jouney.admin.interfaces.journey;

import com.jouney.admin.application.journey.CreateJourney;
import com.jouney.admin.application.journey.DeactivateJourney;
import com.jouney.admin.application.journey.DeleteJourney;
import com.jouney.admin.application.journey.FindJourneys;
import com.jouney.admin.application.journey.GetJourney;
import com.jouney.admin.application.journey.UpdateJourney;
import com.jouney.admin.application.publication.PublishJourney;
import com.jouney.admin.application.publication.UnpublishJourney;
import com.jouney.admin.domain.auth.AuthenticatedUser;
import com.jouney.admin.domain.journey.JourneySort;
import com.jouney.admin.domain.journey.JourneyStatus;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/journeys")
public class JourneyController {

    private final CreateJourney createJourney;
    private final UpdateJourney updateJourney;
    private final GetJourney getJourney;
    private final FindJourneys findJourneys;
    private final DeactivateJourney deactivateJourney;
    private final DeleteJourney deleteJourney;
    private final PublishJourney publishJourney;
    private final UnpublishJourney unpublishJourney;

    public JourneyController(CreateJourney createJourney, UpdateJourney updateJourney, GetJourney getJourney,
                              FindJourneys findJourneys, DeactivateJourney deactivateJourney,
                              DeleteJourney deleteJourney, PublishJourney publishJourney,
                              UnpublishJourney unpublishJourney) {
        this.createJourney = createJourney;
        this.updateJourney = updateJourney;
        this.getJourney = getJourney;
        this.findJourneys = findJourneys;
        this.deactivateJourney = deactivateJourney;
        this.deleteJourney = deleteJourney;
        this.publishJourney = publishJourney;
        this.unpublishJourney = unpublishJourney;
    }

    @PreAuthorize("hasAnyRole('VIEWER','EDITOR','ADMIN')")
    @GetMapping
    public List<JourneyResponse> list(@RequestParam(required = false) UUID productId,
                                       @RequestParam(required = false) UUID channelId,
                                       @RequestParam(required = false) String q,
                                       @RequestParam(required = false) JourneyStatus status,
                                       @RequestParam(required = false, defaultValue = "UPDATED_AT") JourneySort sort) {
        return findJourneys.execute(productId, channelId, q, status, sort).stream()
                .map(JourneyResponse::from).toList();
    }

    @PreAuthorize("hasAnyRole('EDITOR','ADMIN')")
    @PostMapping
    public ResponseEntity<JourneyResponse> create(@Valid @RequestBody JourneyCreateInput input,
                                                   @AuthenticationPrincipal AuthenticatedUser currentUser) {
        var journey = createJourney.execute(input.channelId(), input.name(), input.description(),
                currentUser.userId());
        return ResponseEntity.status(HttpStatus.CREATED).body(JourneyResponse.from(getJourney.execute(journey.getId())));
    }

    @PreAuthorize("hasAnyRole('VIEWER','EDITOR','ADMIN')")
    @GetMapping("/{journeyId}")
    public JourneyResponse get(@PathVariable UUID journeyId) {
        return JourneyResponse.from(getJourney.execute(journeyId));
    }

    @PreAuthorize("hasAnyRole('EDITOR','ADMIN')")
    @PutMapping("/{journeyId}")
    public JourneyResponse update(@PathVariable UUID journeyId, @Valid @RequestBody JourneyUpdateInput input) {
        updateJourney.execute(journeyId, input.name(), input.description());
        return JourneyResponse.from(getJourney.execute(journeyId));
    }

    @PreAuthorize("hasAnyRole('EDITOR','ADMIN')")
    @DeleteMapping("/{journeyId}")
    public ResponseEntity<Void> delete(@PathVariable UUID journeyId) {
        deleteJourney.execute(journeyId);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasAnyRole('EDITOR','ADMIN')")
    @PostMapping("/{journeyId}/deactivate")
    public ResponseEntity<Void> deactivate(@PathVariable UUID journeyId) {
        deactivateJourney.execute(journeyId);
        return ResponseEntity.ok().build();
    }

    @PreAuthorize("hasAnyRole('EDITOR','ADMIN')")
    @PostMapping("/{journeyId}/publish")
    public JourneyResponse publish(@PathVariable UUID journeyId) {
        publishJourney.execute(journeyId);
        return JourneyResponse.from(getJourney.execute(journeyId));
    }

    @PreAuthorize("hasAnyRole('EDITOR','ADMIN')")
    @PostMapping("/{journeyId}/unpublish")
    public JourneyResponse unpublish(@PathVariable UUID journeyId) {
        unpublishJourney.execute(journeyId);
        return JourneyResponse.from(getJourney.execute(journeyId));
    }
}
