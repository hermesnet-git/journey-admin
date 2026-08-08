package com.jouney.admin.interfaces.version;

import com.jouney.admin.application.version.CreateJourneyVersion;
import com.jouney.admin.application.version.GetJourneyVersion;
import com.jouney.admin.application.version.ListJourneyVersions;
import com.jouney.admin.application.version.PublishJourneyVersion;
import com.jouney.admin.domain.auth.AuthenticatedUser;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/journeys/{journeyId}/versions")
public class JourneyVersionController {

    private final ListJourneyVersions listJourneyVersions;
    private final CreateJourneyVersion createJourneyVersion;
    private final GetJourneyVersion getJourneyVersion;
    private final PublishJourneyVersion publishJourneyVersion;

    public JourneyVersionController(ListJourneyVersions listJourneyVersions,
                                     CreateJourneyVersion createJourneyVersion,
                                     GetJourneyVersion getJourneyVersion,
                                     PublishJourneyVersion publishJourneyVersion) {
        this.listJourneyVersions = listJourneyVersions;
        this.createJourneyVersion = createJourneyVersion;
        this.getJourneyVersion = getJourneyVersion;
        this.publishJourneyVersion = publishJourneyVersion;
    }

    @PreAuthorize("hasAnyRole('VIEWER','EDITOR','ADMIN')")
    @GetMapping
    public List<JourneyVersionResponse> list(@PathVariable UUID journeyId) {
        return listJourneyVersions.execute(journeyId).stream().map(JourneyVersionResponse::from).toList();
    }

    @PreAuthorize("hasAnyRole('EDITOR','ADMIN')")
    @PostMapping
    public ResponseEntity<JourneyVersionResponse> create(@PathVariable UUID journeyId,
                                                           @RequestBody(required = false) JourneyVersionCreateInput input,
                                                           @AuthenticationPrincipal AuthenticatedUser currentUser) {
        String description = input != null ? input.description() : null;
        var version = createJourneyVersion.execute(journeyId, description, currentUser.userId());
        return ResponseEntity.status(HttpStatus.CREATED).body(JourneyVersionResponse.from(version));
    }

    @PreAuthorize("hasAnyRole('VIEWER','EDITOR','ADMIN')")
    @GetMapping("/{versionId}")
    public JourneyVersionResponse get(@PathVariable UUID journeyId, @PathVariable UUID versionId) {
        return JourneyVersionResponse.from(getJourneyVersion.execute(journeyId, versionId));
    }

    @PreAuthorize("hasAnyRole('EDITOR','ADMIN')")
    @PostMapping("/{versionId}/publish")
    public JourneyVersionResponse publish(@PathVariable UUID journeyId, @PathVariable UUID versionId) {
        return JourneyVersionResponse.from(publishJourneyVersion.execute(journeyId, versionId));
    }
}
