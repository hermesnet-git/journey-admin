package com.jouney.admin.infrastructure.logging;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingRequestWrapper;
import org.springframework.web.util.ContentCachingResponseWrapper;

/**
 * Logs every API request/response (method, path, status, duration) and carries the correlation id
 * in the MDC so it shows up on every log line produced while handling the request, including the
 * ones from {@link com.jouney.admin.infrastructure.logging.TransactionLoggingAspect}.
 *
 * <p>Payload logging ({@code app.logging.include-payload}) is off by default and meant only for
 * dev/QA ({@code application-dev.yml}/{@code application-qa.yml}) — request/response bodies may
 * carry data not meant for production logs.
 */
public class HttpRequestLoggingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger("com.jouney.admin.http");
    private static final String CORRELATION_HEADER = "X-Correlation-Id";
    private static final String MDC_KEY = "correlationId";
    private static final int MAX_PAYLOAD_LENGTH = 2000;
    private static final long SLOW_REQUEST_THRESHOLD_MS = 1000;
    private static final Pattern SENSITIVE_FIELD = Pattern.compile(
            "(?i)(\"(?:password|token|secret|authorization)\"\\s*:\\s*)\"[^\"]*\"");

    private final boolean includePayload;

    public HttpRequestLoggingFilter(boolean includePayload) {
        this.includePayload = includePayload;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String correlationId = resolveCorrelationId(request);
        MDC.put(MDC_KEY, correlationId);
        response.setHeader(CORRELATION_HEADER, correlationId);

        // ContentCachingResponseWrapper bufferiza tudo internamente e só é copiado pro response real
        // no finally abaixo — incompatível com uma resposta assíncrona/streaming (ex.: SseEmitter em
        // POST /flow/generate), cujas escritas acontecem bem depois desse finally já ter rodado; sem
        // essa exclusão, o cliente nunca recebe nada, mesmo sem nenhum erro no servidor.
        boolean cachePayloads = includePayload && !isMultipart(request) && !isEventStream(request);
        HttpServletRequest loggedRequest =
                cachePayloads ? new ContentCachingRequestWrapper(request, MAX_PAYLOAD_LENGTH) : request;
        ContentCachingResponseWrapper loggedResponse =
                cachePayloads ? new ContentCachingResponseWrapper(response) : null;

        long start = System.currentTimeMillis();
        log.debug("--> {} {}", request.getMethod(), request.getRequestURI());
        try {
            filterChain.doFilter(loggedRequest, loggedResponse != null ? loggedResponse : response);
        } finally {
            long durationMs = System.currentTimeMillis() - start;
            int status = loggedResponse != null ? loggedResponse.getStatus() : response.getStatus();
            if (status >= 400 || durationMs > SLOW_REQUEST_THRESHOLD_MS) {
                log.info("<-- {} {} status={} durationMs={}", request.getMethod(), request.getRequestURI(),
                        status, durationMs);
            } else {
                log.debug("<-- {} {} status={} durationMs={}", request.getMethod(), request.getRequestURI(),
                        status, durationMs);
            }
            if (cachePayloads) {
                logPayload("request body", payloadOf((ContentCachingRequestWrapper) loggedRequest));
                logPayload("response body", payloadOf(loggedResponse));
                loggedResponse.copyBodyToResponse();
            }
            MDC.remove(MDC_KEY);
        }
    }

    private void logPayload(String label, byte[] payload) {
        if (payload == null || payload.length == 0) {
            return;
        }
        String content = new String(payload, StandardCharsets.UTF_8);
        content = SENSITIVE_FIELD.matcher(content).replaceAll("$1\"***\"");
        if (content.length() > MAX_PAYLOAD_LENGTH) {
            content = content.substring(0, MAX_PAYLOAD_LENGTH) + "...(truncated)";
        }
        log.debug("{}: {}", label, content);
    }

    private byte[] payloadOf(ContentCachingRequestWrapper wrapper) {
        return wrapper.getContentAsByteArray();
    }

    private byte[] payloadOf(ContentCachingResponseWrapper wrapper) {
        return wrapper.getContentAsByteArray();
    }

    private boolean isMultipart(HttpServletRequest request) {
        String contentType = request.getContentType();
        return contentType != null && contentType.toLowerCase().startsWith("multipart/");
    }

    private boolean isEventStream(HttpServletRequest request) {
        String accept = request.getHeader("Accept");
        return accept != null && accept.contains("text/event-stream");
    }

    private String resolveCorrelationId(HttpServletRequest request) {
        String header = request.getHeader(CORRELATION_HEADER);
        return (header != null && !header.isBlank()) ? header : UUID.randomUUID().toString();
    }
}
