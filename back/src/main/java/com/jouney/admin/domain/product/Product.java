package com.jouney.admin.domain.product;

import com.jouney.admin.domain.Status;
import java.time.OffsetDateTime;
import java.util.UUID;

public class Product {

    private final UUID id;
    private String name;
    private String description;
    private Status status;
    private final OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public Product(UUID id, String name, String description, Status status,
                   OffsetDateTime createdAt, OffsetDateTime updatedAt) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.status = status;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public static Product create(String name, String description) {
        OffsetDateTime now = OffsetDateTime.now();
        return new Product(UUID.randomUUID(), name, description, Status.ACTIVE, now, now);
    }

    public void update(String name, String description) {
        this.name = name;
        this.description = description;
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

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
