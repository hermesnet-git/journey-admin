package com.jouney.admin.infrastructure.persistence.audit;

import com.jouney.admin.domain.audit.AuditResult;
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
@Table(name = "audit_event")
public class AuditEventJpaEntity {

    @Id
    @Column(name = "audit_event_id")
    private UUID id;

    @Column(name = "user_id")
    private UUID userId;

    @Column(nullable = false)
    private String action;

    @Column(name = "resource_type", nullable = false)
    private String resourceType;

    @Column(name = "resource_id")
    private UUID resourceId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AuditResult result;

    @Column(name = "correlation_id")
    private String correlationId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "previous_value")
    private String previousValue;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "new_value")
    private String newValue;

    @Column(name = "occurred_at", nullable = false)
    private OffsetDateTime occurredAt;

    protected AuditEventJpaEntity() {
    }

    public AuditEventJpaEntity(UUID id, UUID userId, String action, String resourceType, UUID resourceId,
                                AuditResult result, String correlationId, String previousValue, String newValue,
                                OffsetDateTime occurredAt) {
        this.id = id;
        this.userId = userId;
        this.action = action;
        this.resourceType = resourceType;
        this.resourceId = resourceId;
        this.result = result;
        this.correlationId = correlationId;
        this.previousValue = previousValue;
        this.newValue = newValue;
        this.occurredAt = occurredAt;
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getAction() {
        return action;
    }

    public String getResourceType() {
        return resourceType;
    }

    public UUID getResourceId() {
        return resourceId;
    }

    public AuditResult getResult() {
        return result;
    }

    public String getCorrelationId() {
        return correlationId;
    }

    public String getPreviousValue() {
        return previousValue;
    }

    public String getNewValue() {
        return newValue;
    }

    public OffsetDateTime getOccurredAt() {
        return occurredAt;
    }
}
