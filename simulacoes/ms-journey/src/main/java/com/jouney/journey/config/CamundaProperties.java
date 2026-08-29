package com.jouney.journey.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.camunda")
public record CamundaProperties(String baseUrl) {
}
