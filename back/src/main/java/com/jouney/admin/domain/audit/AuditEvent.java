package com.jouney.admin.domain.audit;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Immutable audit trail entry (REQ-08.01/02). Written once by {@code RecordAuditEvent} and never
 * updated or deleted — see FT-08.03. {@code userId} is {@code null} for anonymous events (e.g. a
 * failed login before identity is known).
 */
public record AuditEvent(UUID id, UUID userId, String action, String resourceType, UUID resourceId,
                          AuditResult result, String correlationId, String previousValue, String newValue,
                          OffsetDateTime occurredAt) {
}
