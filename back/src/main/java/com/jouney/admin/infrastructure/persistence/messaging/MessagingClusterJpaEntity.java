package com.jouney.admin.infrastructure.persistence.messaging;

import com.jouney.admin.domain.Status;
import com.jouney.admin.domain.messaging.ClusterType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "messaging_cluster")
public class MessagingClusterJpaEntity {

    @Id
    @Column(name = "cluster_id")
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ClusterType type;

    @Column(name = "connection_address", nullable = false)
    private String connectionAddress;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected MessagingClusterJpaEntity() {
    }

    public MessagingClusterJpaEntity(UUID id, String name, ClusterType type, String connectionAddress,
                                      Status status, OffsetDateTime createdAt, OffsetDateTime updatedAt) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.connectionAddress = connectionAddress;
        this.status = status;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
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

    public Status getStatus() {
        return status;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
