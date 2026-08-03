package com.jouney.admin.domain.journey;

import java.time.OffsetDateTime;
import java.util.UUID;

public class Journey {

    private final UUID id;
    private final UUID channelId;
    private String name;
    private String description;
    private JourneyStatus status;
    private final OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public Journey(UUID id, UUID channelId, String name, String description, JourneyStatus status,
                   OffsetDateTime createdAt, OffsetDateTime updatedAt) {
        this.id = id;
        this.channelId = channelId;
        this.name = name;
        this.description = description;
        this.status = status;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public static Journey create(UUID channelId, String name, String description) {
        OffsetDateTime now = OffsetDateTime.now();
        return new Journey(UUID.randomUUID(), channelId, name, description, JourneyStatus.DRAFT, now, now);
    }

    public void update(String name, String description) {
        this.name = name;
        this.description = description;
        this.updatedAt = OffsetDateTime.now();
    }

    public void deactivate() {
        this.status = JourneyStatus.INACTIVE;
        this.updatedAt = OffsetDateTime.now();
    }

    public void activate() {
        this.status = JourneyStatus.DRAFT;
        this.updatedAt = OffsetDateTime.now();
    }

    public void publish() {
        this.status = JourneyStatus.PUBLISHED;
        this.updatedAt = OffsetDateTime.now();
    }

    public void unpublish() {
        this.status = JourneyStatus.UNPUBLISHED;
        this.updatedAt = OffsetDateTime.now();
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
