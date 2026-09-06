package com.jouney.admin.domain.journey;

public class JourneyTemplateNotFoundException extends RuntimeException {

    public JourneyTemplateNotFoundException(String templateId) {
        super("Journey template not found: " + templateId);
    }
}
