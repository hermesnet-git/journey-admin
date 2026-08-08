package com.jouney.admin.domain.audit;

import java.time.OffsetDateTime;
import java.util.UUID;

public interface AuditEventRepository {

    void save(AuditEvent event);

    AuditEventPage search(AuditEventFilter filter, int page, int size);

    record AuditEventFilter(UUID userId, String action, String resourceType, UUID resourceId, AuditResult result,
                             OffsetDateTime from, OffsetDateTime to, String correlationId) {
    }
}
