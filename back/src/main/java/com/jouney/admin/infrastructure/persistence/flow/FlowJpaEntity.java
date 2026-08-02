package com.jouney.admin.infrastructure.persistence.flow;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "flow")
public class FlowJpaEntity {

    @Id
    @Column(name = "flow_id")
    private String id;

    @Column(name = "journey_id", nullable = false, unique = true)
    private UUID journeyId;

    @Column(nullable = false)
    private String name;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private String nodes;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private String connections;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected FlowJpaEntity() {
    }

    public FlowJpaEntity(String id, UUID journeyId, String name, String nodes, String connections,
                          OffsetDateTime createdAt, OffsetDateTime updatedAt) {
        this.id = id;
        this.journeyId = journeyId;
        this.name = name;
        this.nodes = nodes;
        this.connections = connections;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public String getId() {
        return id;
    }

    public UUID getJourneyId() {
        return journeyId;
    }

    public String getName() {
        return name;
    }

    public String getNodes() {
        return nodes;
    }

    public String getConnections() {
        return connections;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
