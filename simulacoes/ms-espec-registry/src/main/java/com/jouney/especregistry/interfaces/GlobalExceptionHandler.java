package com.jouney.especregistry.interfaces;

import java.time.OffsetDateTime;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import com.jouney.especregistry.simulation.SynchronousChainUnsupportedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.RestClientException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalState(IllegalStateException ex) {
        return build(HttpStatus.CONFLICT, "SIMULATION_STATE_ERROR", ex.getMessage());
    }

    // SimulationController checks this proactively (SynchronousChainCheck) before ever calling
    // Camunda, so this is the normal path now — the RestClientException branch below is only a
    // fallback for a shape that check doesn't yet recognize.
    @ExceptionHandler(SynchronousChainUnsupportedException.class)
    public ResponseEntity<Map<String, Object>> handleSynchronousChainUnsupported(SynchronousChainUnsupportedException ex) {
        return build(HttpStatus.BAD_GATEWAY, "SYNCHRONOUS_CHAIN_UNSUPPORTED", ex.getMessage());
    }

    @ExceptionHandler(RestClientException.class)
    public ResponseEntity<Map<String, Object>> handleUpstream(RestClientException ex) {
        log.error("Chamada a serviço upstream (Camunda/admin-back) falhou", ex);
        if (isSynchronousChainEngineBug(ex)) {
            return build(HttpStatus.BAD_GATEWAY, "SYNCHRONOUS_CHAIN_UNSUPPORTED",
                    "Esta jornada tenta executar um trecho inteiro do fluxo (uma ou mais integrações REST) sem "
                            + "nenhum checkpoint (User Task, Receive Task ou tarefa Kafka) antes de um Fim — o motor "
                            + "não suporta terminar o processo numa cadeia totalmente síncrona. Adicione uma User "
                            + "Task (pode ser sem formulário) antes desse Fim e publique a jornada novamente.");
        }
        return build(HttpStatus.BAD_GATEWAY, "UPSTREAM_UNAVAILABLE", ex.getMessage());
    }

    // Defense in depth: SynchronousChainCheck (proactive, thrown as SynchronousChainUnsupportedException
    // above) mirrors FlowValidator's rule exactly, so this string-matching fallback should no longer
    // ever fire in practice — kept in case some flow shape trips the engine bug that the structural
    // check doesn't (yet) recognize.
    private boolean isSynchronousChainEngineBug(RestClientException ex) {
        String message = ex.getMessage();
        return message != null && message.contains("NullValueException") && message.contains("execution is null");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleUnexpected(Exception ex) {
        log.error("Erro inesperado", ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", ex.getMessage());
    }

    private ResponseEntity<Map<String, Object>> build(HttpStatus status, String code, String message) {
        return ResponseEntity.status(status).body(Map.of(
                "timestamp", OffsetDateTime.now().toString(),
                "status", status.value(),
                "code", code,
                "message", message != null ? message : status.getReasonPhrase()));
    }
}
