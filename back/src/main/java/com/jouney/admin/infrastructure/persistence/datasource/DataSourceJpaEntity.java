package com.jouney.admin.infrastructure.persistence.datasource;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "data_source")
public class DataSourceJpaEntity {

    @Id
    @Column(name = "data_source_id")
    private UUID id;

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(nullable = false)
    private String url;

    @Column(name = "timeout_ms", nullable = false)
    private int timeoutMs;

    @Column(name = "items_path", nullable = false)
    private String itemsPath;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "exposed_fields", nullable = false)
    private List<String> exposedFields;

    @Column(name = "credential_ref")
    private String credentialRef;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected DataSourceJpaEntity() {
    }

    public DataSourceJpaEntity(UUID id, String name, String description, String url, int timeoutMs, String itemsPath,
                               List<String> exposedFields, String credentialRef, OffsetDateTime createdAt,
                               OffsetDateTime updatedAt) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.url = url;
        this.timeoutMs = timeoutMs;
        this.itemsPath = itemsPath;
        this.exposedFields = exposedFields;
        this.credentialRef = credentialRef;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
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

    public String getUrl() {
        return url;
    }

    public int getTimeoutMs() {
        return timeoutMs;
    }

    public String getItemsPath() {
        return itemsPath;
    }

    public List<String> getExposedFields() {
        return exposedFields;
    }

    public String getCredentialRef() {
        return credentialRef;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
