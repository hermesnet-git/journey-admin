package com.jouney.admin.infrastructure.persistence.componentregistry;

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
import com.jouney.admin.domain.componentregistry.ComponentCategory;
import com.jouney.admin.domain.componentregistry.ComponentStatus;

@Entity
@Table(name = "component_definition")
public class ComponentDefinitionJpaEntity {

    @Id
    @Column(name = "component_definition_id")
    private UUID id;

    @Column(nullable = false)
    private String type;

    @Column(nullable = false)
    private String version;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ComponentStatus status;

    @Column(nullable = false)
    private int level;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ComponentCategory category;

    @Column(name = "allows_children", nullable = false)
    private boolean allowsChildren;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "allowed_child_types", nullable = false)
    private String allowedChildTypes;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "props_schema", nullable = false)
    private String propsSchema;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private String events;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "supported_targets", nullable = false)
    private String supportedTargets;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected ComponentDefinitionJpaEntity() {
    }

    public ComponentDefinitionJpaEntity(UUID id, String type, String version, ComponentStatus status, int level,
                                         ComponentCategory category, boolean allowsChildren, String allowedChildTypes,
                                         String propsSchema, String events, String supportedTargets,
                                         OffsetDateTime createdAt, OffsetDateTime updatedAt) {
        this.id = id;
        this.type = type;
        this.version = version;
        this.status = status;
        this.level = level;
        this.category = category;
        this.allowsChildren = allowsChildren;
        this.allowedChildTypes = allowedChildTypes;
        this.propsSchema = propsSchema;
        this.events = events;
        this.supportedTargets = supportedTargets;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public UUID getId() {
        return id;
    }

    public String getType() {
        return type;
    }

    public String getVersion() {
        return version;
    }

    public ComponentStatus getStatus() {
        return status;
    }

    public int getLevel() {
        return level;
    }

    public ComponentCategory getCategory() {
        return category;
    }

    public boolean isAllowsChildren() {
        return allowsChildren;
    }

    public String getAllowedChildTypes() {
        return allowedChildTypes;
    }

    public String getPropsSchema() {
        return propsSchema;
    }

    public String getEvents() {
        return events;
    }

    public String getSupportedTargets() {
        return supportedTargets;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
