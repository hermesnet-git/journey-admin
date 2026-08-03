package com.jouney.admin.domain.form;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public class Form {

    private final UUID id;
    private String name;
    private String description;
    private List<FormField> fields;
    private final OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public Form(UUID id, String name, String description, List<FormField> fields,
                OffsetDateTime createdAt, OffsetDateTime updatedAt) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.fields = fields;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public static Form create(String name, String description, List<FormField> fields) {
        OffsetDateTime now = OffsetDateTime.now();
        return new Form(UUID.randomUUID(), name, description, fields, now, now);
    }

    public void update(String name, String description, List<FormField> fields) {
        this.name = name;
        this.description = description;
        this.fields = fields;
        this.updatedAt = OffsetDateTime.now();
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

    public List<FormField> getFields() {
        return fields;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
