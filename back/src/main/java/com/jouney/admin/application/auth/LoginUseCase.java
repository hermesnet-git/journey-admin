package com.jouney.admin.application.auth;

import com.jouney.admin.application.audit.RecordAuditEvent;
import com.jouney.admin.domain.audit.AuditResult;
import com.jouney.admin.domain.auth.InvalidCredentialsException;
import com.jouney.admin.infrastructure.security.MockUserStore;
import com.jouney.admin.infrastructure.security.Session;
import com.jouney.admin.infrastructure.security.SessionStore;
import org.springframework.stereotype.Service;

@Service
public class LoginUseCase {

    private static final String ACTION = "LOGIN";
    private static final String RESOURCE_TYPE = "SESSION";

    private final MockUserStore mockUserStore;
    private final SessionStore sessionStore;
    private final RecordAuditEvent recordAuditEvent;

    public LoginUseCase(MockUserStore mockUserStore, SessionStore sessionStore, RecordAuditEvent recordAuditEvent) {
        this.mockUserStore = mockUserStore;
        this.sessionStore = sessionStore;
        this.recordAuditEvent = recordAuditEvent;
    }

    public Session execute(String username, String password) {
        var user = mockUserStore.authenticate(username, password);
        if (user.isEmpty()) {
            recordAuditEvent.record(ACTION, RESOURCE_TYPE, null, AuditResult.FAILURE, null);
            throw new InvalidCredentialsException();
        }
        Session session = sessionStore.create(user.get());
        recordAuditEvent.record(ACTION, RESOURCE_TYPE, user.get().userId(), AuditResult.SUCCESS, user.get().userId());
        return session;
    }
}
