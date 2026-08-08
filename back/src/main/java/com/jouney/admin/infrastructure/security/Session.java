package com.jouney.admin.infrastructure.security;

import com.jouney.admin.domain.auth.AuthenticatedUser;
import java.time.OffsetDateTime;

public class Session {

    private final String token;
    private final AuthenticatedUser user;
    private volatile OffsetDateTime lastAccessedAt;

    public Session(String token, AuthenticatedUser user) {
        this.token = token;
        this.user = user;
        this.lastAccessedAt = OffsetDateTime.now();
    }

    public boolean isExpired(long inactivityMinutes) {
        return lastAccessedAt.plusMinutes(inactivityMinutes).isBefore(OffsetDateTime.now());
    }

    public void touch() {
        this.lastAccessedAt = OffsetDateTime.now();
    }

    public String getToken() {
        return token;
    }

    public AuthenticatedUser getUser() {
        return user;
    }
}
