package com.jouney.admin.interfaces;

import com.jouney.admin.domain.ActivePublicationExistsException;
import com.jouney.admin.domain.auth.InvalidCredentialsException;
import com.jouney.admin.domain.auth.InvalidSessionException;
import com.jouney.admin.domain.channel.ChannelNotFoundException;
import com.jouney.admin.domain.channel.ProductInactiveException;
import com.jouney.admin.domain.flow.FlowValidationException;
import com.jouney.admin.domain.form.DuplicateFieldNameException;
import com.jouney.admin.domain.form.FormNotFoundException;
import com.jouney.admin.domain.journey.ChannelInactiveException;
import com.jouney.admin.domain.journey.JourneyInactiveException;
import com.jouney.admin.domain.journey.JourneyNotFoundException;
import com.jouney.admin.domain.journey.JourneyNotPublishedException;
import com.jouney.admin.domain.messaging.ClusterInUseException;
import com.jouney.admin.domain.messaging.ClusterNameAlreadyExistsException;
import com.jouney.admin.domain.messaging.CredentialInUseException;
import com.jouney.admin.domain.messaging.CredentialReferenceNameAlreadyExistsException;
import com.jouney.admin.domain.messaging.CredentialReferenceNotFoundException;
import com.jouney.admin.domain.messaging.MessagingClusterNotFoundException;
import com.jouney.admin.domain.product.ProductNotFoundException;
import com.jouney.admin.domain.version.JourneyVersionNotFoundException;
import com.jouney.admin.domain.version.VersionHasNoFlowException;
import com.jouney.admin.domain.version.VersionNotDraftException;
import com.jouney.admin.domain.version.VersionNotPublishedException;
import com.jouney.admin.domain.version.VersionNotUnpublishedException;
import com.jouney.admin.infrastructure.connector.ConnectorTestException;
import com.jouney.admin.infrastructure.connector.SsrfBlockedException;
import com.jouney.admin.infrastructure.dashboard.RuntimeMonitoringException;
import com.jouney.admin.infrastructure.messaging.MessagingConnectionTestException;
import com.jouney.admin.infrastructure.publication.RuntimePublicationException;
import jakarta.servlet.http.HttpServletRequest;
import java.time.OffsetDateTime;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler({ProductNotFoundException.class, ChannelNotFoundException.class,
            JourneyNotFoundException.class, FormNotFoundException.class, JourneyVersionNotFoundException.class,
            MessagingClusterNotFoundException.class, CredentialReferenceNotFoundException.class})
    public ResponseEntity<ApiError> handleNotFound(RuntimeException ex, HttpServletRequest request) {
        return build(HttpStatus.NOT_FOUND, "NOT_FOUND", ex.getMessage(), request, null);
    }

    @ExceptionHandler({ActivePublicationExistsException.class, JourneyNotPublishedException.class,
            JourneyInactiveException.class, VersionNotDraftException.class, VersionNotPublishedException.class,
            VersionNotUnpublishedException.class, ClusterInUseException.class, CredentialInUseException.class,
            ClusterNameAlreadyExistsException.class, CredentialReferenceNameAlreadyExistsException.class})
    public ResponseEntity<ApiError> handleConflict(RuntimeException ex, HttpServletRequest request) {
        return build(HttpStatus.CONFLICT, "CONFLICT", ex.getMessage(), request, null);
    }

    @ExceptionHandler({ProductInactiveException.class, ChannelInactiveException.class, VersionHasNoFlowException.class,
            DuplicateFieldNameException.class})
    public ResponseEntity<ApiError> handleUnprocessable(RuntimeException ex, HttpServletRequest request) {
        return build(HttpStatus.UNPROCESSABLE_ENTITY, "UNPROCESSABLE_ENTITY", ex.getMessage(), request, null);
    }

    @ExceptionHandler({SsrfBlockedException.class, ConnectorTestException.class})
    public ResponseEntity<ApiError> handleConnectorTest(RuntimeException ex, HttpServletRequest request) {
        return build(HttpStatus.UNPROCESSABLE_ENTITY, "UNPROCESSABLE_ENTITY", ex.getMessage(), request, null);
    }

    @ExceptionHandler({InvalidCredentialsException.class, InvalidSessionException.class})
    public ResponseEntity<ApiError> handleUnauthorized(RuntimeException ex, HttpServletRequest request) {
        return build(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", ex.getMessage(), request, null);
    }

    @ExceptionHandler(RuntimePublicationException.class)
    public ResponseEntity<ApiError> handleRuntimePublication(RuntimePublicationException ex, HttpServletRequest request) {
        log.error("Runtime publication call failed", ex);
        return build(HttpStatus.BAD_GATEWAY, "RUNTIME_UNAVAILABLE", ex.getMessage(), request, null);
    }

    @ExceptionHandler(MessagingConnectionTestException.class)
    public ResponseEntity<ApiError> handleMessagingConnectionTest(MessagingConnectionTestException ex, HttpServletRequest request) {
        log.error("Messaging connection test call failed", ex);
        return build(HttpStatus.BAD_GATEWAY, "RUNTIME_UNAVAILABLE", ex.getMessage(), request, null);
    }

    // Status < 500 de propósito: uma resposta 5xx dispara o modal genérico de "erro inesperado" no
    // front (ver AppErrorBoundary/onServerError), com detalhes técnicos. Aqui é uma condição
    // conhecida (engine fora do ar) — o Dashboard mostra só a mensagem amigável no seu próprio banner.
    @ExceptionHandler(RuntimeMonitoringException.class)
    public ResponseEntity<ApiError> handleRuntimeMonitoring(RuntimeMonitoringException ex, HttpServletRequest request) {
        log.error("Runtime monitoring call failed", ex);
        return build(HttpStatus.FAILED_DEPENDENCY, "RUNTIME_UNAVAILABLE", ex.getMessage(), request, null);
    }

    @ExceptionHandler(FlowValidationException.class)
    public ResponseEntity<ApiError> handleFlowValidation(FlowValidationException ex, HttpServletRequest request) {
        List<ApiError.ApiErrorDetail> details = ex.getViolations().stream()
                .map(v -> new ApiError.ApiErrorDetail("flow", "STRUCTURAL_VIOLATION", v))
                .toList();
        return build(HttpStatus.UNPROCESSABLE_ENTITY, "UNPROCESSABLE_ENTITY", ex.getMessage(), request, details);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        List<ApiError.ApiErrorDetail> details = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> new ApiError.ApiErrorDetail(error.getField(), "INVALID",
                        error.getDefaultMessage()))
                .toList();
        return build(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Request validation failed", request, details);
    }

    // Root exception handler: anything not mapped above (e.g. a data integrity violation) would
    // otherwise escape this advice and fall through to Spring's default error dispatch, which is
    // re-authenticated by the security filter chain and can surface to the client as a 401 instead
    // of the real 500 — masking server errors as session/login problems.
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleUnexpected(Exception ex, HttpServletRequest request) {
        log.error("Unhandled exception processing {} {}", request.getMethod(), request.getRequestURI(), ex);
        Throwable root = rootCause(ex);
        String message = String.format("%s: %s", root.getClass().getSimpleName(),
                root.getMessage() != null ? root.getMessage() : ex.getClass().getSimpleName());
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", message, request, null);
    }

    private static Throwable rootCause(Throwable ex) {
        Throwable current = ex;
        while (current.getCause() != null && current.getCause() != current) {
            current = current.getCause();
        }
        return current;
    }

    private ResponseEntity<ApiError> build(HttpStatus status, String code, String message,
                                            HttpServletRequest request, List<ApiError.ApiErrorDetail> details) {
        ApiError error = new ApiError(OffsetDateTime.now(), status.value(), code, message,
                request.getRequestURI(), details);
        return ResponseEntity.status(status).body(error);
    }
}
