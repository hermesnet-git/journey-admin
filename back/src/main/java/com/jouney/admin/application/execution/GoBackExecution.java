package com.jouney.admin.application.execution;

import com.jouney.admin.domain.execution.BackNavigation;
import com.jouney.admin.domain.execution.ExecutionStep;
import com.jouney.admin.domain.flow.ConnectorConfig;
import com.jouney.admin.domain.flow.ConnectorType;
import com.jouney.admin.domain.flow.FlowNode;
import com.jouney.admin.domain.flow.FlowNodeType;
import com.jouney.admin.domain.version.JourneyVersion;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

/**
 * Botão "Voltar" da tela (action.navigate com destino "voltar") na Execução: reabre a tela anterior
 * sem concluir a atual — a regra está em {@link BackNavigation}. Quando não dá para voltar, devolve o
 * mesmo passo com a mensagem em {@code errorMessage}.
 */
@Service
public class GoBackExecution {

    // Ids (separados por vírgula) das telas do histórico que já foram destino de um "voltar" — mesmo
    // nome que o ms-journey usa, para a regra valer igual na Execução e nos canais.
    static final String CONSUMED_VARIABLE = "_voltasConsumidas";

    private final RuntimeExecutionPort runtimeExecutionPort;
    private final ExecutionStepResolver stepResolver;

    public GoBackExecution(RuntimeExecutionPort runtimeExecutionPort, ExecutionStepResolver stepResolver) {
        this.runtimeExecutionPort = runtimeExecutionPort;
        this.stepResolver = stepResolver;
    }

    public ExecutionStep execute(String processInstanceId) {
        ExecutionStep current = stepResolver.resolve(processInstanceId);
        if (!"USER_TASK".equals(current.type())) {
            throw new IllegalStateException("A instância " + processInstanceId + " não está numa tela");
        }
        JourneyVersion version = stepResolver.versionOf(processInstanceId);

        Object consumedValue = runtimeExecutionPort.getProcessVariables(processInstanceId).get(CONSUMED_VARIABLE);
        String consumedText = consumedValue != null ? String.valueOf(consumedValue) : "";
        Set<String> consumed = consumedText.isBlank() ? new LinkedHashSet<>() : new LinkedHashSet<>(List.of(consumedText.split(",")));
        List<BackNavigation.Activity> history = runtimeExecutionPort.getFullActivityHistory(processInstanceId).stream()
                .map(a -> new BackNavigation.Activity(a.id(), a.activityId(), a.activityType(), a.startTime(), a.endTime(), a.canceled()))
                .toList();
        BackNavigation.Decision decision = BackNavigation.decide(history, current.nodeId(), consumed, writeNodeIds(version));
        if (decision.target() == null) {
            return current.withError(null, null, decision.refusal(), null);
        }
        String openInstance = runtimeExecutionPort.findActiveActivityInstanceId(processInstanceId, current.nodeId())
                .orElseThrow(() -> new IllegalStateException("Tela atual não encontrada no motor: " + current.nodeId()));
        runtimeExecutionPort.reopenActivity(processInstanceId, decision.target().activityId(), openInstance,
                "Voltar à tela anterior: " + current.nodeId() + " → " + decision.target().activityId());
        consumed.add(decision.target().id());
        runtimeExecutionPort.setProcessVariable(processInstanceId, CONSUMED_VARIABLE, String.join(",", consumed), "String");
        return stepResolver.resolve(processInstanceId);
    }

    // Integração que grava no sistema de origem: tudo que não é REST GET.
    private static Set<String> writeNodeIds(JourneyVersion version) {
        return version.getFlowNodes().stream()
                .filter(node -> node.getType() == FlowNodeType.SERVICE_TASK && !isRestRead(node))
                .map(FlowNode::getId)
                .collect(Collectors.toSet());
    }

    private static boolean isRestRead(FlowNode node) {
        ConnectorConfig connector = node.getConnectorConfig();
        return connector != null && connector.getConnectorType() == ConnectorType.REST
                && connector.getConfig() != null && "GET".equalsIgnoreCase(String.valueOf(connector.getConfig().get("method")));
    }
}
