package com.jouney.admin.infrastructure.security;

import com.jouney.admin.domain.auth.AuthenticatedUser;
import com.jouney.admin.domain.auth.Role;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * Mocked user directory for the MVP (REQ-07.01, REQ-07.04). Real user registration/persistence
 * is out of scope; a single hardcoded admin/admin user is provided with a fixed userId so other
 * epics (journey created_by, execution user_id) can reference it consistently.
 */
@Component
public class MockUserStore {

    public static final UUID ADMIN_USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

    private static final String USERNAME = "admin";
    private static final String PASSWORD = "admin";
    private static final AuthenticatedUser ADMIN = new AuthenticatedUser(ADMIN_USER_ID, USERNAME, Role.ADMIN);

    public Optional<AuthenticatedUser> authenticate(String username, String password) {
        if (USERNAME.equals(username) && PASSWORD.equals(password)) {
            return Optional.of(ADMIN);
        }
        return Optional.empty();
    }
}
