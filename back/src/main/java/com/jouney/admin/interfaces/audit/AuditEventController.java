package com.jouney.admin.interfaces.audit;

import com.jouney.admin.application.audit.FindAuditEvents;
import com.jouney.admin.domain.audit.AuditResult;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Read-only query API over the audit trail (REQ-08.04). ADMIN only — audit access is itself
 * sensitive. Querying the log is read-only and does not generate a new audit event.
 */
@RestController
@RequestMapping("/api/v1/audit-events")
public class AuditEventController {

    private final FindAuditEvents findAuditEvents;

    public AuditEventController(FindAuditEvents findAuditEvents) {
        this.findAuditEvents = findAuditEvents;
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public AuditEventPageResponse list(@RequestParam(required = false) UUID userId,
                                        @RequestParam(required = false) String action,
                                        @RequestParam(required = false) String resourceType,
                                        @RequestParam(required = false) UUID resourceId,
                                        @RequestParam(required = false) AuditResult result,
                                        @RequestParam(required = false) OffsetDateTime from,
                                        @RequestParam(required = false) OffsetDateTime to,
                                        @RequestParam(required = false) String correlationId,
                                        @RequestParam(defaultValue = "0") int page,
                                        @RequestParam(defaultValue = "20") int size) {
        var resultPage = findAuditEvents.execute(userId, action, resourceType, resourceId, result, from, to,
                correlationId, page, size);
        return AuditEventPageResponse.from(resultPage);
    }
}
