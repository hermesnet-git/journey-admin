package com.jouney.admin.interfaces.audit;

import com.jouney.admin.domain.audit.AuditEventPage;
import java.util.List;

public record AuditEventPageResponse(List<AuditEventResponse> items, long totalElements, int page, int size) {

    public static AuditEventPageResponse from(AuditEventPage pageResult) {
        return new AuditEventPageResponse(
                pageResult.items().stream().map(AuditEventResponse::from).toList(),
                pageResult.totalElements(), pageResult.page(), pageResult.size());
    }
}
