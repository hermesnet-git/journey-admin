package com.jouney.admin.application.execution;

import com.jouney.admin.application.execution.FlowVersionResolver.ResolvedFlow;
import com.jouney.admin.application.execution.RuntimeExecutionPort.HistoricInstance;
import com.jouney.admin.domain.execution.ExecutionInstance;
import com.jouney.admin.domain.execution.ExecutionStep;
import com.jouney.admin.domain.execution.InstanceNotFoundException;
import com.jouney.admin.domain.execution.InstanceNotResumableException;
import com.jouney.admin.domain.execution.KafkaVariableNames;
import com.jouney.admin.domain.execution.ProcessIds;
import com.jouney.admin.domain.execution.ResumedExecution;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Reabre uma instância `ACTIVE` já em andamento na tela de Execução, achada por ID ou business
 * key — pro usuário voltar a interagir com ela ao vivo (responder a próxima User Task, pular
 * etapa, etc.) depois de ter fechado a aba, atualizado o navegador, ou simplesmente saído da tela
 * no meio do caminho. Diferente de {@link StartExecution} (recebe a versão escolhida de antemão),
 * aqui a versão/fluxo é resolvida a partir da instância já existente ({@link FlowVersionResolver},
 * mesmo mecanismo do Diagnóstico). Instância concluída ou encerrada não é retomável aqui — nesse
 * estado, consultá-la continua sendo papel do Diagnóstico (FT-15, REQ-15.04.001/002).
 */
@Service
public class ResumeExecution {

    private static final String ACTIVE_STATE = "ACTIVE";

    private final RuntimeExecutionPort runtimeExecutionPort;
    private final FlowVersionResolver flowVersionResolver;
    private final ExecutionStepResolver stepResolver;

    public ResumeExecution(RuntimeExecutionPort runtimeExecutionPort, FlowVersionResolver flowVersionResolver,
                            ExecutionStepResolver stepResolver) {
        this.runtimeExecutionPort = runtimeExecutionPort;
        this.flowVersionResolver = flowVersionResolver;
        this.stepResolver = stepResolver;
    }

    public ResumedExecution execute(String idOrBusinessKey) {
        HistoricInstance instance = findByIdOrBusinessKey(idOrBusinessKey);
        if (!ACTIVE_STATE.equals(instance.state())) {
            throw new InstanceNotResumableException(instance.id(), instance.state());
        }

        UUID journeyId = ProcessIds.journeyIdFromKey(instance.processDefinitionKey());
        ResolvedFlow resolved = flowVersionResolver.resolve(journeyId, instance.processDefinitionId());
        // `since = EPOCH` pede a trilha inteira da instância, não só o que rodou depois de uma ação —
        // é o que ExecutionWorkspace usa pra reconstruir visitedPath/nodeIO/log ao montar (mesmo
        // mecanismo já usado pelo primeiro passo de StartExecution, ver initialStep.trail), senão o
        // diagrama mostraria só START + passo atual, como se nada tivesse acontecido antes da retomada.
        ExecutionStep step = stepResolver.resolve(instance.id(), Instant.EPOCH);

        Map<String, Object> variables = runtimeExecutionPort.getProcessVariables(instance.id());
        boolean manualKafkaControl = Boolean.TRUE.equals(variables.get(KafkaVariableNames.MANUAL_CONTROL));
        String channel = (String) variables.get("channel");

        ExecutionInstance executionInstance = new ExecutionInstance(instance.id(), instance.businessKey(),
                resolved.channelTypes(), resolved.flowNodes(), resolved.flowConnections(), step, manualKafkaControl);
        return new ResumedExecution(journeyId, resolved.journeyName(), channel, executionInstance);
    }

    private HistoricInstance findByIdOrBusinessKey(String idOrBusinessKey) {
        HistoricInstance byId = runtimeExecutionPort.getHistoricProcessInstance(idOrBusinessKey).orElse(null);
        if (byId != null) {
            return byId;
        }
        List<HistoricInstance> byBusinessKey = runtimeExecutionPort
                .searchHistoricInstances(null, idOrBusinessKey, null, null, null, 1);
        if (!byBusinessKey.isEmpty()) {
            return byBusinessKey.get(0);
        }
        throw new InstanceNotFoundException(idOrBusinessKey);
    }
}
