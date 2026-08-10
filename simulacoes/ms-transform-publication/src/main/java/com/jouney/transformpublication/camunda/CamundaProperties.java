package com.jouney.transformpublication.camunda;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "camunda.rest")
public record CamundaProperties(String baseUrl) {
}
