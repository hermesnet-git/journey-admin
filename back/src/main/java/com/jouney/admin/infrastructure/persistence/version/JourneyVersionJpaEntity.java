package com.jouney.admin.infrastructure.persistence.version;

import com.jouney.admin.domain.version.VersionStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "journey_version")
public class JourneyVersionJpaEntity {

    @Id
    @Column(name = "version_id")
    private UUID id;

    @Column(name = "journey_id", nullable = false)
    private UUID journeyId;

    @Column(name = "version_number", nullable = false)
    private int versionNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "version_status", nullable = false)
    private VersionStatus status;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "version_snapshot", nullable = false)
    private String snapshot;

    private String description;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "published_at")
    private OffsetDateTime publishedAt;

    protected JourneyVersionJpaEntity() {
    }

    public JourneyVersionJpaEntity(UUID id, UUID journeyId, int versionNumber, VersionStatus status, String snapshot,
                                    String description, UUID createdBy, OffsetDateTime createdAt,
                                    OffsetDateTime publishedAt) {
        this.id = id;
        this.journeyId = journeyId;
        this.versionNumber = versionNumber;
        this.status = status;
        this.snapshot = snapshot;
        this.description = description;
        this.createdBy = createdBy;
        this.createdAt = createdAt;
        this.publishedAt = publishedAt;
    }

    public UUID getId() {
        return id;
    }

    public UUID getJourneyId() {
        return journeyId;
    }

    public int getVersionNumber() {
        return versionNumber;
    }

    public VersionStatus getStatus() {
        return status;
    }

    public String getSnapshot() {
        return snapshot;
    }

    public String getDescription() {
        return description;
    }

    public UUID getCreatedBy() {
        return createdBy;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getPublishedAt() {
        return publishedAt;
    }
}
