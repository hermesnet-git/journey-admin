package com.jouney.admin.domain.execution;

import com.jouney.admin.domain.flow.ConnectorConfig;
import java.util.List;

/** O que o usuário deve ver agora numa instância de execução: uma User Task com sua tela, um passo
 * não-interativo aguardando (SERVICE_TASK/RECEIVE_TASK/GATEWAY resolvidos automaticamente pelo
 * motor), ou o fim do fluxo. Espelha o mesmo vocabulário do {@code ms-journey}
 * ({@code JourneyStepResolver}) e do simulador interno do ms-espec-registry. */
public record ExecutionStep(String type, String taskId, String nodeId, String nodeName, String nodeType,
                             ResolvedForm form, List<TrailEntry> trail, String errorNodeId, String errorNodeName,
                             String errorMessage, ConnectorConfig errorConnectorConfig) {

    public static ExecutionStep userTask(String taskId, String nodeId, String nodeName, ResolvedForm form) {
        return new ExecutionStep("USER_TASK", taskId, nodeId, nodeName, "USER_TASK", form, List.of(), null, null, null, null);
    }

    public static ExecutionStep waiting(String nodeId, String nodeName, String nodeType) {
        return new ExecutionStep("WAITING", null, nodeId, nodeName, nodeType, null, List.of(), null, null, null, null);
    }

    public static ExecutionStep ended() {
        return new ExecutionStep("ENDED", null, null, null, null, null, List.of(), null, null, null, null);
    }

    public ExecutionStep withTrail(List<TrailEntry> trail) {
        return new ExecutionStep(type, taskId, nodeId, nodeName, nodeType, form, trail, errorNodeId, errorNodeName,
                errorMessage, errorConnectorConfig);
    }

    /** {@code errorNodeId}/{@code errorNodeName}/{@code errorConnectorConfig} nulos quando a
     * heurística ({@link FlowGraph}) não acha nenhum candidato a partir do passo atual. */
    public ExecutionStep withError(String errorNodeId, String errorNodeName, String errorMessage,
                                    ConnectorConfig errorConnectorConfig) {
        return new ExecutionStep(type, taskId, nodeId, nodeName, nodeType, form, trail, errorNodeId, errorNodeName,
                errorMessage, errorConnectorConfig);
    }
}
