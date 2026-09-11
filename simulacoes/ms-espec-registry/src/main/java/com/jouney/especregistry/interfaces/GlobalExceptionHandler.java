package com.jouney.especregistry.interfaces;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import com.jouney.especregistry.domain.journey.SynchronousChainUnsupportedException;
import com.jouney.especregistry.infrastructure.sdui.StrapiSnapshotException;
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

    // FormSpecController.convertStartVariables checa isso proativamente (SynchronousChainCheck)
    // antes de a jornada ser iniciada pelo admin/back — o RestClientException branch abaixo é só um
    // fallback pra um formato de erro que essa checagem ainda não reconhece.
    @ExceptionHandler(SynchronousChainUnsupportedException.class)
    public ResponseEntity<Map<String, Object>> handleSynchronousChainUnsupported(SynchronousChainUnsupportedException ex) {
        return build(HttpStatus.BAD_GATEWAY, "SYNCHRONOUS_CHAIN_UNSUPPORTED", ex.getMessage());
    }

    @ExceptionHandler(StrapiSnapshotException.class)
    public ResponseEntity<Map<String, Object>> handleStrapiSnapshot(StrapiSnapshotException ex) {
        log.error("Chamada ao Strapi (snapshots SDUI) falhou", ex);
        return build(HttpStatus.BAD_GATEWAY, "STRAPI_UNAVAILABLE", ex.getMessage());
    }

    @ExceptionHandler(RestClientException.class)
    public ResponseEntity<Map<String, Object>> handleUpstream(RestClientException ex) {
        log.error("Chamada a serviço upstream (admin-back) falhou", ex);
        if (isSynchronousChainEngineBug(ex)) {
            return build(HttpStatus.BAD_GATEWAY, "SYNCHRONOUS_CHAIN_UNSUPPORTED",
                    "Esta jornada tenta executar um trecho inteiro do fluxo (uma ou mais integrações REST) sem "
                            + "nenhum checkpoint (User Task, Receive Task ou tarefa Kafka) antes de um Fim — o motor "
                            + "não suporta terminar o processo numa cadeia totalmente síncrona. Adicione uma User "
                            + "Task (pode ser sem formulário) antes desse Fim e publique a jornada novamente.");
        }
        if (isSpinJsonPathFailure(ex)) {
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
