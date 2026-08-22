package com.jouney.admin.infrastructure.security;

import com.jouney.admin.application.audit.RecordAuditEvent;
import com.jouney.admin.domain.audit.AuditResult;
import com.jouney.admin.domain.auth.AuthenticatedUser;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Resolves the "Authorization: Bearer <token>" header against the in-memory {@link SessionStore}
 * and populates the Spring Security context so {@code @PreAuthorize} and controllers can read the
 * current user (REQ-07.02). Invalid/missing tokens simply leave the context unauthenticated;
 * Spring Security's entry point then rejects the request with 401 for protected endpoints. A
 * token that was presented but did not resolve (expired or unknown) is audited as DENIED
 * (REQ-08.02 session expiration/block) — a request with no token at all (e.g. anonymous browsing
 * of the login endpoint) is not, since no session was actually being asserted.
 */
public class BearerTokenAuthFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private final SessionStore sessionStore;
    private final RecordAuditEvent recordAuditEvent;

    public BearerTokenAuthFilter(SessionStore sessionStore, RecordAuditEvent recordAuditEvent) {
        this.sessionStore = sessionStore;
        this.recordAuditEvent = recordAuditEvent;
    }

    // Endpoints assíncronos (SseEmitter, ex.: POST /flow/generate) fazem o Spring reentrar na cadeia
    // de filtros num dispatch ASYNC quando a resposta é finalizada — o padrão de OncePerRequestFilter
    // é pular esse segundo passe, mas como a sessão é STATELESS (REQ-07.02), a autenticação só existe
    // porque este filtro a recoloca no SecurityContextHolder a cada passe; pular o ASYNC deixaria
    // esse segundo passe sem ninguém autenticado, e authorizeHttpRequests().anyRequest().authenticated()
    // rejeitaria com 401 em cima de uma resposta SSE que já tinha sido enviada com sucesso.
    @Override
    protected boolean shouldNotFilterAsyncDispatch() {
        return false;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith(BEARER_PREFIX)) {
            String token = header.substring(BEARER_PREFIX.length());
            var user = sessionStore.resolve(token);
            if (user.isPresent()) {
                authenticate(user.get());
            } else {
                recordAuditEvent.record("SESSION_EXPIRED", "SESSION", null, AuditResult.DENIED, null);
            }
        }
        filterChain.doFilter(request, response);
    }

    private void authenticate(AuthenticatedUser user) {
        var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + user.role().name()));
        var authentication = new UsernamePasswordAuthenticationToken(user, null, authorities);
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }
}
