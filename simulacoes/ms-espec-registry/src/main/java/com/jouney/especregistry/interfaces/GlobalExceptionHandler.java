package com.jouney.especregistry.interfaces;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import com.jouney.especregistry.simulation.StartFailureDiagnosedException;
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

    // SimulationController.start() already ran StartFailureDiagnostic before throwing this (it has
    // the snapshot/variables in scope right where the failure happens) — this just carries that
    // result into the response body, so the front can highlight the exact node in the flow preview
    // from this one response, no second call needed.
    @ExceptionHandler(StartFailureDiagnosedException.class)
    public ResponseEntity<Map<String, Object>> handleStartFailureDiagnosed(StartFailureDiagnosedException ex) {
        log.error("Falha síncrona ao iniciar jornada — diagnóstico: {}", ex.diagnosis());
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", OffsetDateTime.now().toString());
        body.put("status", HttpStatus.BAD_GATEWAY.value());
        body.put("code", "SYNCHRONOUS_CHAIN_JSONPATH_FAILURE");
        body.put("message", "Uma integração REST executada de forma síncrona (antes do primeiro checkpoint da "
                + "jornada) tentou ler, pelo Mapeamento de Saída, um campo que a resposta real não trouxe.");
        body.put("diagnosis", ex.diagnosis());
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(body);
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
        if (isSpinJsonPathFailure(ex)) {
            // start() already converts this same shape into StartFailureDiagnosedException (with a
            // diagnosis attached) before it ever reaches here — this fallback only covers the same
            // error surfacing from some other endpoint (e.g. resuming past a checkpoint into another
            // synchronous REST chain), where there's no equivalent "diagnose from the start" context.
            return build(HttpStatus.BAD_GATEWAY, "SYNCHRONOUS_CHAIN_JSONPATH_FAILURE",
                    "Uma integração REST executada de forma síncrona tentou ler, pelo Mapeamento de Saída, um "
                            + "campo que a resposta real não trouxe.");
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

    // A SERVICE_TASK REST connected right after Start (no checkpoint before it) runs inside the same
    // transaction as "start process instance" — an outputMapping rule whose jsonPath doesn't exist in
    // the real response crashes the whole instantiation with this Spin error instead of failing just
    // that node.
    private boolean isSpinJsonPathFailure(RestClientException ex) {
        String message = ex.getMessage();
        return message != null && message.contains("SpinJsonPathException");
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
