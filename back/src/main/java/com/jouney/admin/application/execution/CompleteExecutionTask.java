package com.jouney.admin.application.execution;

import com.jouney.admin.domain.execution.AnswerConversion;
import com.jouney.admin.domain.execution.ExecutionStep;
import com.jouney.admin.domain.version.JourneyVersion;
import java.time.Instant;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;

/**
 * Completa a User Task ativa de uma instância, com a resposta já coercionada pro tipo certo
 * (números/booleanos, não tudo string — ver {@link AnswerConversion}).
 */
@Service
public class CompleteExecutionTask {

    private final RuntimeExecutionPort runtimeExecutionPort;
    private final ExecutionStepResolver stepResolver;

    public CompleteExecutionTask(RuntimeExecutionPort runtimeExecutionPort, ExecutionStepResolver stepResolver) {
        this.runtimeExecutionPort = runtimeExecutionPort;
        this.stepResolver = stepResolver;
    }

    public ExecutionStep execute(String processInstanceId, String taskId, Map<String, Object> answers) {
        ExecutionStep current = stepResolver.resolve(processInstanceId);
        if (!"USER_TASK".equals(current.type()) || !taskId.equals(current.taskId())) {
            throw new IllegalStateException("Task " + taskId + " não é o passo ativo atual da instância " + processInstanceId);
        }
        Instant before = Instant.now();
        Map<String, Object> converted = AnswerConversion.fromAnswers(current.form().sdui(), answers != null ? answers : Map.of());
        try {
            runtimeExecutionPort.completeTask(taskId, converted);
        } catch (RestClientException e) {
            JourneyVersion version = stepResolver.versionOf(processInstanceId);
            return ExecutionErrorAttribution.attribute(current, version, stepResolver, e);
        }
        return stepResolver.resolve(processInstanceId, before);
    }
}
