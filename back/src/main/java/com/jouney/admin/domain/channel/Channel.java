package com.jouney.admin.domain.channel;

import com.jouney.admin.domain.Status;
import java.time.OffsetDateTime;
import java.util.UUID;

public class Channel {

    private final UUID id;
    private final UUID productId;
    private String name;
    private String description;
    private ChannelType type;
    private Status status;
    private final OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public Channel(UUID id, UUID productId, String name, String description, ChannelType type,
                   Status status, OffsetDateTime createdAt, OffsetDateTime updatedAt) {
        this.id = id;
        this.productId = productId;
        this.name = name;
        this.description = description;
        this.type = type;
        this.status = status;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public static Channel create(UUID productId, String name, String description, ChannelType type) {
        OffsetDateTime now = OffsetDateTime.now();
        return new Channel(UUID.randomUUID(), productId, name, description, type, Status.ACTIVE, now, now);
    }

    public void update(String name, String description, ChannelType type) {
        this.name = name;
        this.description = description;
        this.type = type;
        this.updatedAt = OffsetDateTime.now();
    }

    public void deactivate() {
        this.status = Status.INACTIVE;
        this.updatedAt = OffsetDateTime.now();
    }

    public void activate() {
        this.status = Status.ACTIVE;
        this.updatedAt = OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getProductId() {
        return productId;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public ChannelType getType() {
        return type;
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
