package com.jouney.admin.application.audit;

import com.jouney.admin.domain.audit.AuditEvent;
import com.jouney.admin.domain.audit.AuditEventRepository;
import com.jouney.admin.domain.audit.AuditResult;
import com.jouney.admin.domain.auth.AuthenticatedUser;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import tools.jackson.databind.ObjectMapper;

/**
 * Writes audit trail entries (REQ-08.01/02). Audit writing is a side effect of the business
 * operation, not the operation itself: persistence failures are logged at ERROR and swallowed so
 * an audit outage never breaks the underlying request (FT-08.03).
 */
@Service
public class RecordAuditEvent {

    private static final Logger log = LoggerFactory.getLogger(RecordAuditEvent.class);
    private static final String CORRELATION_HEADER = "X-Correlation-Id";

    private final AuditEventRepository repository;
    private final ObjectMapper objectMapper;

    public RecordAuditEvent(AuditEventRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    public void record(String action, String resourceType, UUID resourceId, AuditResult result) {
        record(action, resourceType, resourceId, result, currentUserId(), null, null);
    }

    public void record(String action, String resourceType, UUID resourceId, AuditResult result, UUID userId) {
        record(action, resourceType, resourceId, result, userId, null, null);
    }

    public void record(String action, String resourceType, UUID resourceId, AuditResult result,
                        Map<String, ?> previousValue, Map<String, ?> newValue) {
        record(action, resourceType, resourceId, result, currentUserId(), previousValue, newValue);
    }

    public void record(String action, String resourceType, UUID resourceId, AuditResult result, UUID userId,
                        Map<String, ?> previousValue, Map<String, ?> newValue) {
        try {
            AuditEvent event = new AuditEvent(UUID.randomUUID(), userId, action, resourceType, resourceId, result,
                    correlationId(), writeJson(previousValue), writeJson(newValue), OffsetDateTime.now());
            repository.save(event);
        } catch (Exception e) {
            log.error("Failed to record audit event: action={} resourceType={} resourceId={} result={}",
                    action, resourceType, resourceId, result, e);
        }
    }

    private UUID currentUserId() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof AuthenticatedUser user) {
            return user.userId();
        }
        return null;
    }

    private String correlationId() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes servletAttributes) {
            String header = servletAttributes.getRequest().getHeader(CORRELATION_HEADER);
            if (header != null && !header.isBlank()) {
                return header;
            }
        }
        return UUID.randomUUID().toString();
    }

    private String writeJson(Map<String, ?> value) {
        if (value == null) {
            return null;
        }
        return objectMapper.writeValueAsString(value);
    }
}
