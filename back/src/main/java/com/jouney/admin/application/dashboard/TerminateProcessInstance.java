package com.jouney.admin.application.dashboard;

import com.jouney.admin.application.audit.RecordAuditEvent;
import com.jouney.admin.domain.audit.AuditResult;
import java.util.UUID;
import org.springframework.stereotype.Component;

/** Encerra manualmente uma instância abandonada, a pedido de um operador pelo Dashboard — ação
 * destrutiva sobre o motor de runtime, por isso fica registrada na trilha de auditoria (mesmo
 * padrão de qualquer outra ação administrativa neste portal). */
@Component
public class TerminateProcessInstance {

    private static final String ACTION = "PROCESS_INSTANCE_TERMINATE";
    private static final String RESOURCE_TYPE = "PROCESS_INSTANCE";

    private final RuntimeInstanceControlPort control;
    private final RecordAuditEvent recordAuditEvent;

    public TerminateProcessInstance(RuntimeInstanceControlPort control, RecordAuditEvent recordAuditEvent) {
        this.control = control;
        this.recordAuditEvent = recordAuditEvent;
    }

    public void execute(String processInstanceId) {
        try {
            control.terminate(processInstanceId);
        } catch (RuntimeException e) {
            recordAuditEvent.record(ACTION, RESOURCE_TYPE, parseId(processInstanceId), AuditResult.FAILURE);
            throw e;
        }
        recordAuditEvent.record(ACTION, RESOURCE_TYPE, parseId(processInstanceId), AuditResult.SUCCESS);
    }

    // Ids do Camunda vêm no formato UUID, mas o registro de auditoria não deve quebrar a ação
    // principal caso um dia isso mude — degrada pra null em vez de propagar.
    private static UUID parseId(String processInstanceId) {
        try {
            return UUID.fromString(processInstanceId);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
