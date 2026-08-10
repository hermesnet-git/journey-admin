package com.jouney.transformpublication.interfaces;

import com.jouney.transformpublication.bpmn.BpmnTransformationException;
import com.jouney.transformpublication.camunda.CamundaDeploymentException;
import java.time.OffsetDateTime;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(BpmnTransformationException.class)
    public ResponseEntity<Map<String, Object>> handleTransformation(BpmnTransformationException ex) {
        return build(HttpStatus.UNPROCESSABLE_ENTITY, "BPMN_TRANSFORMATION_ERROR", ex.getMessage());
    }

    @ExceptionHandler(CamundaDeploymentException.class)
    public ResponseEntity<Map<String, Object>> handleDeployment(CamundaDeploymentException ex) {
        log.error("Camunda deployment call failed", ex);
        return build(HttpStatus.BAD_GATEWAY, "CAMUNDA_UNAVAILABLE", ex.getMessage());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleUnexpected(Exception ex) {
        log.error("Unhandled exception", ex);
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
