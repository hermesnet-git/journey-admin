package com.jouney.admin.interfaces.simulationaudit;

import com.jouney.admin.application.simulationaudit.RecordSimulationStart;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** A simulação em si é executada pelo {@code ms-espec-registry} (sem sessão do portal) — este
 * endpoint só registra, na auditoria do admin/back, que o usuário autenticado iniciou uma
 * simulação. Chamado pelo admin/front logo após {@code POST /journeys/{id}/instances} no
 * ms-espec-registry retornar com sucesso. */
@RestController
@RequestMapping("/api/v1/simulation-audit")
public class SimulationAuditController {

    private final RecordSimulationStart recordSimulationStart;

    public SimulationAuditController(RecordSimulationStart recordSimulationStart) {
        this.recordSimulationStart = recordSimulationStart;
    }

    @PreAuthorize("hasAnyRole('VIEWER','EDITOR','ADMIN')")
    @PostMapping("/started")
    public ResponseEntity<Void> started(@Valid @RequestBody SimulationStartedRequest request) {
        recordSimulationStart.execute(request.journeyId(), request.journeyName(), request.processInstanceId());
        return ResponseEntity.noContent().build();
    }
}
