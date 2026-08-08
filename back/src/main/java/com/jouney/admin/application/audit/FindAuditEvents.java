package com.jouney.admin.application.audit;

import com.jouney.admin.domain.audit.AuditEventPage;
import com.jouney.admin.domain.audit.AuditEventRepository;
import com.jouney.admin.domain.audit.AuditEventRepository.AuditEventFilter;
import com.jouney.admin.domain.audit.AuditResult;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class FindAuditEvents {

    private final AuditEventRepository repository;

    public FindAuditEvents(AuditEventRepository repository) {
        this.repository = repository;
    }

    public AuditEventPage execute(UUID userId, String action, String resourceType, UUID resourceId,
                                   AuditResult result, OffsetDateTime from, OffsetDateTime to, String correlationId,
                                   int page, int size) {
        AuditEventFilter filter = new AuditEventFilter(userId, action, resourceType, resourceId, result, from, to,
                correlationId);
        return repository.search(filter, page, size);
    }
}
