package com.jouney.admin.interfaces;

import com.jouney.admin.domain.ActivePublicationExistsException;
import com.jouney.admin.domain.auth.InvalidCredentialsException;
import com.jouney.admin.domain.auth.InvalidSessionException;
import com.jouney.admin.domain.channel.ChannelNotFoundException;
import com.jouney.admin.domain.channel.ProductInactiveException;
import com.jouney.admin.domain.flow.FlowValidationException;
import com.jouney.admin.domain.form.FormNotFoundException;
import com.jouney.admin.domain.journey.ChannelInactiveException;
import com.jouney.admin.domain.journey.JourneyDeletionBlockedException;
import com.jouney.admin.domain.journey.JourneyNotFoundException;
import com.jouney.admin.domain.journey.JourneyNotPublishedException;
import com.jouney.admin.domain.product.ProductNotFoundException;
import com.jouney.admin.domain.version.JourneyVersionNotFoundException;
import com.jouney.admin.domain.version.VersionNotDraftException;
import jakarta.servlet.http.HttpServletRequest;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler({ProductNotFoundException.class, ChannelNotFoundException.class,
            JourneyNotFoundException.class, FormNotFoundException.class, JourneyVersionNotFoundException.class})
    public ResponseEntity<ApiError> handleNotFound(RuntimeException ex, HttpServletRequest request) {
        return build(HttpStatus.NOT_FOUND, "NOT_FOUND", ex.getMessage(), request, null);
    }

    @ExceptionHandler({ActivePublicationExistsException.class, JourneyDeletionBlockedException.class,
            JourneyNotPublishedException.class, VersionNotDraftException.class})
    public ResponseEntity<ApiError> handleConflict(RuntimeException ex, HttpServletRequest request) {
        return build(HttpStatus.CONFLICT, "CONFLICT", ex.getMessage(), request, null);
    }

    @ExceptionHandler({ProductInactiveException.class, ChannelInactiveException.class})
    public ResponseEntity<ApiError> handleUnprocessable(RuntimeException ex, HttpServletRequest request) {
        return build(HttpStatus.UNPROCESSABLE_ENTITY, "UNPROCESSABLE_ENTITY", ex.getMessage(), request, null);
    }

    @ExceptionHandler({InvalidCredentialsException.class, InvalidSessionException.class})
    public ResponseEntity<ApiError> handleUnauthorized(RuntimeException ex, HttpServletRequest request) {
        return build(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", ex.getMessage(), request, null);
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

    private ResponseEntity<ApiError> build(HttpStatus status, String code, String message,
                                            HttpServletRequest request, List<ApiError.ApiErrorDetail> details) {
        ApiError error = new ApiError(OffsetDateTime.now(), status.value(), code, message,
                request.getRequestURI(), details);
        return ResponseEntity.status(status).body(error);
    }
}
