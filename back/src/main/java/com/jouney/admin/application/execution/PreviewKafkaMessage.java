package com.jouney.admin.application.execution;

import com.jouney.admin.domain.execution.KafkaPayload;
import com.jouney.admin.domain.execution.ExecutionStep;
import com.jouney.admin.domain.flow.ConnectorConfig;
import com.jouney.admin.domain.flow.ConnectorType;
import com.jouney.admin.domain.flow.FlowNode;
import com.jouney.admin.domain.flow.FlowNodeType;
import com.jouney.admin.domain.version.JourneyVersion;
import java.util.Map;
import org.springframework.stereotype.Service;

/** Só resolve o payload que "Gerar automaticamente" enviaria, sem publicar nada — pré-preenche o
 * editor de envio manual com um JSON válido de partida em vez de abrir em branco. */
@Service
public class PreviewKafkaMessage {

    private final RuntimeExecutionPort runtimeExecutionPort;
    private final ExecutionStepResolver stepResolver;

    public PreviewKafkaMessage(RuntimeExecutionPort runtimeExecutionPort, ExecutionStepResolver stepResolver) {
        this.runtimeExecutionPort = runtimeExecutionPort;
        this.stepResolver = stepResolver;
    }

    public Object execute(String processInstanceId) {
        ExecutionStep current = stepResolver.resolve(processInstanceId);
        if (!"WAITING".equals(current.type())) {
            throw new IllegalStateException("Instância " + processInstanceId + " não está aguardando um passo não-usuário");
        }
        JourneyVersion version = stepResolver.versionOf(processInstanceId);
        FlowNode node = stepResolver.findNode(version, current.nodeId());
        ConnectorConfig connectorConfig = node.getConnectorConfig();
        if (node.getType() != FlowNodeType.SERVICE_TASK || connectorConfig == null
                || connectorConfig.getConnectorType() != ConnectorType.KAFKA) {
            throw new IllegalStateException("Nó " + node.getId() + " não é um Service Task com conector Kafka");
        }
        Map<String, Object> rawVariables = runtimeExecutionPort.getProcessVariables(processInstanceId);
        return KafkaPayload.resolveBusinessPayload(connectorConfig, rawVariables);
    }
}
