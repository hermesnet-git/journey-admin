package com.jouney.admin.interfaces.executionaudit;

import com.jouney.admin.application.executionaudit.RecordExecutionStart;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** A execução em si é feita pelo {@code ms-espec-registry} (sem sessão do portal) — este
 * endpoint só registra, na auditoria do admin/back, que o usuário autenticado iniciou uma
 * execução. Chamado pelo admin/front logo após {@code POST /journeys/{id}/instances} no
 * ms-espec-registry retornar com sucesso. */
@RestController
@RequestMapping("/api/v1/execution-audit")
public class ExecutionAuditController {

    private final RecordExecutionStart recordExecutionStart;

    public ExecutionAuditController(RecordExecutionStart recordExecutionStart) {
        this.recordExecutionStart = recordExecutionStart;
    }

    @PreAuthorize("hasAnyRole('VIEWER','EDITOR','ADMIN')")
    @PostMapping("/started")
    public ResponseEntity<Void> started(@Valid @RequestBody ExecutionStartedRequest request) {
        recordExecutionStart.execute(request.journeyId(), request.journeyName(), request.processInstanceId());
        return ResponseEntity.noContent().build();
    }
}
