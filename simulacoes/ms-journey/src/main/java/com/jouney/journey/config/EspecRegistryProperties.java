package com.jouney.journey.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.espec-registry")
public record EspecRegistryProperties(String baseUrl) {
}
