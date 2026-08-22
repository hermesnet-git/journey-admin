package com.jouney.admin.domain.messaging;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Cluster/broker de mensageria corporativo cadastrado no catálogo (FT-14, US-14.01). Nome
 * "MessagingCluster" (não "Cluster") de propósito, para não colidir com "cluster Kubernetes" em
 * documentação/discussões futuras sobre infraestrutura (AKS).
 */
public class MessagingCluster {

    private final UUID id;
    private String name;
    private ClusterType type;
    private String connectionAddress;
    private final OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public MessagingCluster(UUID id, String name, ClusterType type, String connectionAddress,
                             OffsetDateTime createdAt, OffsetDateTime updatedAt) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.connectionAddress = connectionAddress;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public static MessagingCluster create(String name, ClusterType type, String connectionAddress) {
        OffsetDateTime now = OffsetDateTime.now();
        return new MessagingCluster(UUID.randomUUID(), name, type, connectionAddress, now, now);
    }

    public void update(String name, ClusterType type, String connectionAddress) {
        this.name = name;
        this.type = type;
        this.connectionAddress = connectionAddress;
        this.updatedAt = OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public ClusterType getType() {
        return type;
    }

    public String getConnectionAddress() {
        return connectionAddress;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
