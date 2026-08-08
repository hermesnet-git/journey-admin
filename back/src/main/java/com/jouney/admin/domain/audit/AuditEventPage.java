package com.jouney.admin.domain.audit;

import java.util.List;

public record AuditEventPage(List<AuditEvent> items, long totalElements, int page, int size) {
}
