package com.jouney.bffcanalapp.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.ms-journey")
public record MsJourneyProperties(String baseUrl) {
}
