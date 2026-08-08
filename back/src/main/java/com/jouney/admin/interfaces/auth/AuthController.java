package com.jouney.admin.interfaces.auth;

import com.jouney.admin.application.auth.LoginUseCase;
import com.jouney.admin.application.auth.LogoutUseCase;
import com.jouney.admin.domain.auth.AuthenticatedUser;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Mocked authentication (REQ-07.01/02/04): a real identity provider is out of scope for the MVP.
 * A single mock user (admin/admin, role ADMIN) is accepted; sessions are opaque bearer tokens
 * held in memory (see {@link com.jouney.admin.infrastructure.security.SessionStore}).
 */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private static final String BEARER_PREFIX = "Bearer ";

    private final LoginUseCase loginUseCase;
    private final LogoutUseCase logoutUseCase;

    public AuthController(LoginUseCase loginUseCase, LogoutUseCase logoutUseCase) {
        this.loginUseCase = loginUseCase;
        this.logoutUseCase = logoutUseCase;
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return AuthResponse.from(loginUseCase.execute(request.username(), request.password()));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith(BEARER_PREFIX)) {
            logoutUseCase.execute(header.substring(BEARER_PREFIX.length()));
        }
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public AuthResponse me(@AuthenticationPrincipal AuthenticatedUser user, HttpServletRequest request) {
        String token = request.getHeader("Authorization").substring(BEARER_PREFIX.length());
        return AuthResponse.from(token, user);
    }
}
