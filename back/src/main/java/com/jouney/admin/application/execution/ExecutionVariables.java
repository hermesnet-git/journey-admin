package com.jouney.admin.application.execution;

import com.jouney.admin.application.execution.RuntimeExecutionPort.TypedVariable;
import java.util.Map;
import org.springframework.stereotype.Service;

/** Consulta e edição manual de variáveis de uma instância em execução — observabilidade da
 * Execução (visualizar o que a jornada gravou, e forçar um valor pra testar um caminho de
 * decisão). */
@Service
public class ExecutionVariables {

    private final RuntimeExecutionPort runtimeExecutionPort;

    public ExecutionVariables(RuntimeExecutionPort runtimeExecutionPort) {
        this.runtimeExecutionPort = runtimeExecutionPort;
    }

    public Map<String, TypedVariable> list(String processInstanceId) {
        return runtimeExecutionPort.getTypedProcessVariables(processInstanceId);
    }

    public Map<String, TypedVariable> set(String processInstanceId, String name, Object value, String type) {
        runtimeExecutionPort.setProcessVariable(processInstanceId, name, value, type);
        return runtimeExecutionPort.getTypedProcessVariables(processInstanceId);
    }
}
