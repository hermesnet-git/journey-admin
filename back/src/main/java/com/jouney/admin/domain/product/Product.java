package com.jouney.admin.domain.product;

import com.jouney.admin.domain.Status;
import com.jouney.admin.domain.channel.ChannelType;
import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

public class Product {

    private final UUID id;
    private String name;
    private String description;
    private Status status;
    private Set<ChannelType> channelTypes;
    private final OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public Product(UUID id, String name, String description, Status status, Set<ChannelType> channelTypes,
                    OffsetDateTime createdAt, OffsetDateTime updatedAt) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.status = status;
        this.channelTypes = new LinkedHashSet<>(channelTypes);
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public static Product create(String name, String description, Set<ChannelType> channelTypes) {
        requireNonEmpty(channelTypes);
        OffsetDateTime now = OffsetDateTime.now();
        return new Product(UUID.randomUUID(), name, description, Status.ACTIVE, channelTypes, now, now);
    }

    public void update(String name, String description, Set<ChannelType> channelTypes) {
        requireNonEmpty(channelTypes);
        this.name = name;
        this.description = description;
        this.channelTypes = new LinkedHashSet<>(channelTypes);
        this.updatedAt = OffsetDateTime.now();
    }

    private static void requireNonEmpty(Set<ChannelType> channelTypes) {
        if (channelTypes == null || channelTypes.isEmpty()) {
            throw new ProductChannelTypesEmptyException();
        }
    }

    public void deactivate() {
        this.status = Status.INACTIVE;
        this.updatedAt = OffsetDateTime.now();
    }

    public void activate() {
        this.status = Status.ACTIVE;
        this.updatedAt = OffsetDateTime.now();
    }

    public boolean isActive() {
        return status == Status.ACTIVE;
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public Status getStatus() {
        return status;
    }

    public Set<ChannelType> getChannelTypes() {
        return Set.copyOf(channelTypes);
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
