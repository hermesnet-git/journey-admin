package com.jouney.admin.infrastructure.security;

import com.jouney.admin.domain.auth.AuthenticatedUser;
import com.jouney.admin.domain.auth.InvalidSessionException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * In-memory opaque bearer token store (REQ-07.02). Not backed by HttpSession/JWT by design —
 * tokens are random, sessions expire after a configurable inactivity window.
 */
@Component
public class SessionStore {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final ConcurrentHashMap<String, Session> sessions = new ConcurrentHashMap<>();
    private final long inactivityMinutes;

    public SessionStore(@Value("${app.security.session-inactivity-minutes}") long inactivityMinutes) {
        this.inactivityMinutes = inactivityMinutes;
    }

    public Session create(AuthenticatedUser user) {
        String token = generateToken();
        Session session = new Session(token, user);
        sessions.put(token, session);
        return session;
    }

    public void invalidate(String token) {
        sessions.remove(token);
    }

    public Optional<AuthenticatedUser> resolve(String token) {
        Session session = sessions.get(token);
        if (session == null) {
            return Optional.empty();
        }
        if (session.isExpired(inactivityMinutes)) {
            sessions.remove(token);
            return Optional.empty();
        }
        session.touch();
        return Optional.of(session.getUser());
    }

    public AuthenticatedUser requireValid(String token) {
        return resolve(token).orElseThrow(() -> new InvalidSessionException("Session is invalid or expired"));
    }

    private static String generateToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
