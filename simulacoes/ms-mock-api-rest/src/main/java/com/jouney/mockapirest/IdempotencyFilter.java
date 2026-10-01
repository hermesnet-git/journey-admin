package com.jouney.mockapirest;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingResponseWrapper;

/**
 * Respeita o header Idempotency-Key em POST, como um sistema real faria: a mesma chave no mesmo
 * caminho devolve a resposta já dada, sem executar de novo (o conector REST do motor manda a mesma
 * chave em todas as tentativas de uma etapa). Só respostas 2xx são guardadas — uma falha (ex.: 503)
 * não "gruda" na chave, então a nova tentativa executa de verdade.
 */
@Component
public class IdempotencyFilter extends OncePerRequestFilter {

    private record StoredResponse(int status, String contentType, byte[] body) {
    }

    // ponytail: memória sem expiração — mock local reiniciado a cada subida; num sistema real a
    // chave expira (ex.: 24 h).
    private final Map<String, StoredResponse> responses = new ConcurrentHashMap<>();

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !"POST".equalsIgnoreCase(request.getMethod()) || request.getHeader("Idempotency-Key") == null;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String key = request.getRequestURI() + "|" + request.getHeader("Idempotency-Key");
        StoredResponse stored = responses.get(key);
        if (stored != null) {
            response.setStatus(stored.status());
            if (stored.contentType() != null) {
                response.setContentType(stored.contentType());
            }
            response.setHeader("Idempotent-Replayed", "true");
            response.getOutputStream().write(stored.body());
            return;
        }
        ContentCachingResponseWrapper wrapper = new ContentCachingResponseWrapper(response);
        chain.doFilter(request, wrapper);
        if (wrapper.getStatus() >= 200 && wrapper.getStatus() < 300) {
            responses.put(key, new StoredResponse(wrapper.getStatus(), wrapper.getContentType(), wrapper.getContentAsByteArray()));
        }
        wrapper.copyBodyToResponse();
    }
}
