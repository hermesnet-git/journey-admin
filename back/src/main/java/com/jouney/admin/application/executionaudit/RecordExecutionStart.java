package com.jouney.admin.application.simulationaudit;

import com.jouney.admin.application.audit.RecordAuditEvent;
import com.jouney.admin.domain.audit.AuditResult;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * A execução da simulação em si roda contra o Camunda por meio do {@code ms-espec-registry} — um
 * serviço deliberadamente sem sessão/autenticação (REQ-05.04), então não tem como gravar auditoria
 * sozinho. O admin/front chama isto logo após iniciar uma simulação com sucesso, atribuindo o evento
 * ao usuário autenticado da sessão do portal.
 */
@Component
public class RecordSimulationStart {

    private static final String ACTION = "SIMULATION_START";
    private static final String RESOURCE_TYPE = "JOURNEY";

    private final RecordAuditEvent recordAuditEvent;

    public RecordSimulationStart(RecordAuditEvent recordAuditEvent) {
        this.recordAuditEvent = recordAuditEvent;
    }

    public void execute(UUID journeyId, String journeyName, String processInstanceId) {
        recordAuditEvent.record(ACTION, RESOURCE_TYPE, journeyId, AuditResult.SUCCESS, null,
                Map.of("journeyName", journeyName, "processInstanceId", processInstanceId));
    }
}
