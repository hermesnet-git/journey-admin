package com.jouney.admin.application.execution;

import com.jouney.admin.domain.execution.AnswerConversion;
import com.jouney.admin.domain.execution.ExecutionStep;
import com.jouney.admin.domain.flow.FlowNode;
import com.jouney.admin.domain.flow.FlowNodeType;
import com.jouney.admin.domain.version.JourneyVersion;
import java.time.Instant;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;

/** "Pular etapa" (REQ-05.05.001/US-05.09.009): fabrica o resultado de um passo não-interativo em
 * espera (SERVICE_TASK/RECEIVE_TASK), sem depender de um conector de verdade responder — mecanismo
 * secundário de teste, alternativo à execução real (produção/consumo REST/Kafka de fato). */
@Service
public class SkipStep {

    private final RuntimeExecutionPort runtimeExecutionPort;
    private final ExecutionStepResolver stepResolver;

    public SkipStep(RuntimeExecutionPort runtimeExecutionPort, ExecutionStepResolver stepResolver) {
        this.runtimeExecutionPort = runtimeExecutionPort;
        this.stepResolver = stepResolver;
    }

    public ExecutionStep execute(String processInstanceId) {
        ExecutionStep current = stepResolver.resolve(processInstanceId);
        if (!"WAITING".equals(current.type())) {
            throw new IllegalStateException("Instância " + processInstanceId + " não está aguardando um passo não-usuário");
        }
        JourneyVersion version = stepResolver.versionOf(processInstanceId);
        FlowNode node = stepResolver.findNode(version, current.nodeId());
        Map<String, Object> variables = AnswerConversion.fabricateFromOutputMapping(node.getConnectorConfig());

        Instant before = Instant.now();
        try {
            if (node.getType() == FlowNodeType.RECEIVE_TASK) {
                runtimeExecutionPort.correlateMessage("Message_" + node.getId(), processInstanceId, variables);
            } else {
                runtimeExecutionPort.completeExternalTask(processInstanceId, node.getId(), variables);
            }
        } catch (RestClientException e) {
            return ExecutionErrorAttribution.attribute(current, version, stepResolver, e);
        }
        return stepResolver.resolve(processInstanceId, before);
    }
}
