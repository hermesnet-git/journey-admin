package com.jouney.admin.domain.auth;

import java.util.UUID;

public record AuthenticatedUser(UUID userId, String username, Role role) {
}
