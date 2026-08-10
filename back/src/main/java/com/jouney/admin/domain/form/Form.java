package com.jouney.admin.domain.form;

import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public class Form {

    private final UUID id;
    private String name;
    private String description;
    private List<FormField> fields;
    private final OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    // Intentionally does not validate field names: also used to rehydrate forms from persistence
    // (including old, already-published snapshots that predate the name-based field identity).
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
        validateFieldNames(fields);
        OffsetDateTime now = OffsetDateTime.now();
        return new Form(UUID.randomUUID(), name, description, fields, now, now);
    }

    public void update(String name, String description, List<FormField> fields) {
        validateFieldNames(fields);
        this.name = name;
        this.description = description;
        this.fields = fields;
        this.updatedAt = OffsetDateTime.now();
    }

    private static void validateFieldNames(List<FormField> fields) {
        Set<String> seen = new HashSet<>();
        for (FormField field : fields) {
            if (!seen.add(field.getName())) {
                throw new DuplicateFieldNameException(field.getName());
            }
        }
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
