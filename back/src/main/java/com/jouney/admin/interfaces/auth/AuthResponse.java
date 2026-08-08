package com.jouney.admin.interfaces.auth;

import com.jouney.admin.domain.auth.AuthenticatedUser;
import com.jouney.admin.domain.auth.Role;
import com.jouney.admin.infrastructure.security.Session;
import java.util.UUID;

public record AuthResponse(String token, UUID userId, String username, Role role) {

    public static AuthResponse from(Session session) {
        return new AuthResponse(session.getToken(), session.getUser().userId(), session.getUser().username(),
                session.getUser().role());
    }

    public static AuthResponse from(String token, AuthenticatedUser user) {
        return new AuthResponse(token, user.userId(), user.username(), user.role());
    }
}
