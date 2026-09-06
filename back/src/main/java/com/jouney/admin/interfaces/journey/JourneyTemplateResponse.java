package com.jouney.admin.interfaces.journey;

import com.jouney.admin.domain.journey.JourneyTemplate;

public record JourneyTemplateResponse(String templateId, String name, String description) {

    public static JourneyTemplateResponse from(JourneyTemplate template) {
        return new JourneyTemplateResponse(template.id(), template.name(), template.description());
    }
}
