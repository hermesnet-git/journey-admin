package com.jouney.admin.interfaces.audit;

import com.jouney.admin.application.audit.FindAuditEvents;
import com.jouney.admin.application.audit.RecordAuditEvent;
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
 * sensitive. Querying the log is, per REQ-08.04.005, an auditable event in its own right.
 */
@RestController
@RequestMapping("/api/v1/audit-events")
public class AuditEventController {

    private static final String RESOURCE_TYPE = "AUDIT_LOG";

    private final FindAuditEvents findAuditEvents;
    private final RecordAuditEvent recordAuditEvent;

    public AuditEventController(FindAuditEvents findAuditEvents, RecordAuditEvent recordAuditEvent) {
        this.findAuditEvents = findAuditEvents;
        this.recordAuditEvent = recordAuditEvent;
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
        recordAuditEvent.record("QUERY_AUDIT_LOG", RESOURCE_TYPE, null, AuditResult.SUCCESS);
        return AuditEventPageResponse.from(resultPage);
    }
}
