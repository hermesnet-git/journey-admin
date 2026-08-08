package com.jouney.admin.application.auth;

import com.jouney.admin.application.audit.RecordAuditEvent;
import com.jouney.admin.domain.audit.AuditResult;
import com.jouney.admin.infrastructure.security.SessionStore;
import org.springframework.stereotype.Service;

@Service
public class LogoutUseCase {

    private static final String ACTION = "LOGOUT";
    private static final String RESOURCE_TYPE = "SESSION";

    private final SessionStore sessionStore;
    private final RecordAuditEvent recordAuditEvent;

    public LogoutUseCase(SessionStore sessionStore, RecordAuditEvent recordAuditEvent) {
        this.sessionStore = sessionStore;
        this.recordAuditEvent = recordAuditEvent;
    }

    public void execute(String token) {
        var user = sessionStore.resolve(token);
        sessionStore.invalidate(token);
        recordAuditEvent.record(ACTION, RESOURCE_TYPE, user.map(u -> u.userId()).orElse(null), AuditResult.SUCCESS,
                user.map(u -> u.userId()).orElse(null));
    }
}
