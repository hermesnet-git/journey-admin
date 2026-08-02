package com.jouney.admin.infrastructure.persistence.journey;

import com.jouney.admin.domain.journey.JourneyStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "journey")
public class JourneyJpaEntity {

    @Id
    @Column(name = "journey_id")
    private UUID id;

    @Column(name = "channel_id", nullable = false)
    private UUID channelId;

    @Column(nullable = false)
    private String name;

    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private JourneyStatus status;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected JourneyJpaEntity() {
    }

    public JourneyJpaEntity(UUID id, UUID channelId, String name, String description, JourneyStatus status,
                             OffsetDateTime createdAt, OffsetDateTime updatedAt) {
        this.id = id;
        this.channelId = channelId;
        this.name = name;
        this.description = description;
        this.status = status;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public UUID getId() {
        return id;
    }

    public UUID getChannelId() {
        return channelId;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public JourneyStatus getStatus() {
        return status;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
