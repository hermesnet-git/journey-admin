package com.jouney.especregistry.kafka;

public record ConnectionTestRequest(String clusterType, String connectionAddress, String credentialReferenceName) {
}
