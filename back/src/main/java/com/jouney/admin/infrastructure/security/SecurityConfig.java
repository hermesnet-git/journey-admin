package com.jouney.admin.infrastructure.security;

import com.jouney.admin.application.audit.RecordAuditEvent;
import com.jouney.admin.domain.audit.AuditResult;
import com.jouney.admin.infrastructure.logging.HttpRequestLoggingFilter;
import com.jouney.admin.interfaces.ApiError;
import java.time.OffsetDateTime;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsUtils;
import tools.jackson.databind.ObjectMapper;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Value("${app.logging.include-payload:false}")
    private boolean includePayloadInLogs;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, SessionStore sessionStore, ObjectMapper objectMapper,
                                            RecordAuditEvent recordAuditEvent)
            throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(org.springframework.security.config.Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(CorsUtils::isPreFlightRequest).permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/login").permitAll()
                        .anyRequest().authenticated())
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, ex) ->
                                writeApiError(response, objectMapper, 401, "UNAUTHORIZED",
                                        "Authentication required", request.getRequestURI()))
                        .accessDeniedHandler((request, response, ex) -> {
                            // REQ-08.02: access denied due to lack of permission (403 from
                            // @PreAuthorize) is an auditable DENIED event.
                            recordAuditEvent.record("ACCESS_DENIED", "ENDPOINT", null, AuditResult.DENIED);
                            writeApiError(response, objectMapper, 403, "FORBIDDEN",
                                    "You do not have permission to perform this operation", request.getRequestURI());
                        }))
                .addFilterBefore(new BearerTokenAuthFilter(sessionStore, recordAuditEvent),
                        UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(new HttpRequestLoggingFilter(includePayloadInLogs), BearerTokenAuthFilter.class);
        return http.build();
    }

    private static void writeApiError(jakarta.servlet.http.HttpServletResponse response, ObjectMapper objectMapper,
                                       int status, String code, String message, String path) throws java.io.IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        ApiError error = new ApiError(OffsetDateTime.now(), status, code, message, path, null);
        response.getWriter().write(objectMapper.writeValueAsString(error));
    }
}
