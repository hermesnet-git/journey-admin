package com.jouney.admin.infrastructure.persistence.publication;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "journey_publication")
public class PublicationJpaEntity {

    @Id
    @Column(name = "publication_id")
    private UUID id;

    @Column(name = "journey_id", nullable = false, unique = true)
    private UUID journeyId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private String snapshot;

    @Column(name = "published_at", nullable = false)
    private OffsetDateTime publishedAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected PublicationJpaEntity() {
    }

    public PublicationJpaEntity(UUID id, UUID journeyId, String snapshot, OffsetDateTime publishedAt,
                                 OffsetDateTime createdAt, OffsetDateTime updatedAt) {
        this.id = id;
        this.journeyId = journeyId;
        this.snapshot = snapshot;
        this.publishedAt = publishedAt;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public UUID getId() {
        return id;
    }

    public UUID getJourneyId() {
        return journeyId;
    }

    public String getSnapshot() {
        return snapshot;
    }

    public OffsetDateTime getPublishedAt() {
        return publishedAt;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
