package com.jouney.admin.interfaces.audit;

import com.jouney.admin.domain.audit.AuditEvent;
import com.jouney.admin.domain.audit.AuditResult;
import java.time.OffsetDateTime;
import java.util.UUID;

public record AuditEventResponse(UUID auditEventId, UUID userId, String action, String resourceType,
                                  UUID resourceId, AuditResult result, String correlationId, String previousValue,
                                  String newValue, OffsetDateTime occurredAt) {

    public static AuditEventResponse from(AuditEvent event) {
        return new AuditEventResponse(event.id(), event.userId(), event.action(), event.resourceType(),
                event.resourceId(), event.result(), event.correlationId(), event.previousValue(), event.newValue(),
                event.occurredAt());
    }
}
