package com.jouney.especregistry.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.admin-back")
public record AdminBackProperties(String baseUrl, String serviceUsername, String servicePassword) {
}
