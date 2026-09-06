package com.jouney.admin.interfaces.journey;

import com.jouney.admin.application.journey.ListJourneyTemplates;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/journey-templates")
public class JourneyTemplateController {

    private final ListJourneyTemplates listJourneyTemplates;

    public JourneyTemplateController(ListJourneyTemplates listJourneyTemplates) {
        this.listJourneyTemplates = listJourneyTemplates;
    }

    @PreAuthorize("hasAnyRole('VIEWER','EDITOR','ADMIN')")
    @GetMapping
    public List<JourneyTemplateResponse> list() {
        return listJourneyTemplates.execute().stream().map(JourneyTemplateResponse::from).toList();
    }
}
