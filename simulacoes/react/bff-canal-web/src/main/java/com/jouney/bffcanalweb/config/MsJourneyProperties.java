package com.jouney.bffcanalweb.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.ms-journey")
public record MsJourneyProperties(String baseUrl) {
}
