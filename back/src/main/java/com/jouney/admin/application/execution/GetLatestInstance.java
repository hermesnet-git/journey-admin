package com.jouney.admin.application.execution;

import com.jouney.admin.application.execution.RuntimeExecutionPort.ProcessInstance;
import com.jouney.admin.domain.execution.ExecutionInstance;
import com.jouney.admin.domain.execution.ExecutionStep;
import com.jouney.admin.domain.execution.ProcessIds;
import com.jouney.admin.domain.journey.JourneyNotPublishedException;
import com.jouney.admin.domain.publication.Publication;
import com.jouney.admin.domain.publication.PublicationRepository;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;

/** Instância mais nova de uma jornada iniciada depois de {@code since} — usado pelo front pra saber
 * quando uma mensagem de teste enviada pra um MESSAGE_START_EVENT efetivamente iniciou uma
 * instância nova (não existe processInstanceId nenhum antes disso pra fazer polling em cima).
 * Instância iniciada por mensagem externa nunca tem controle manual de Kafka — não houve momento
 * pra oferecer esse toggle. */
@Service
public class GetLatestInstance {

    private final PublicationRepository publicationRepository;
    private final RuntimeExecutionPort runtimeExecutionPort;
    private final ExecutionStepResolver stepResolver;

    public GetLatestInstance(PublicationRepository publicationRepository, RuntimeExecutionPort runtimeExecutionPort,
                              ExecutionStepResolver stepResolver) {
        this.publicationRepository = publicationRepository;
        this.runtimeExecutionPort = runtimeExecutionPort;
        this.stepResolver = stepResolver;
    }

    public Optional<ExecutionInstance> execute(UUID journeyId, Instant since) {
        String processDefinitionKey = ProcessIds.keyForJourney(journeyId);
        String processInstanceId = runtimeExecutionPort
                .findMostRecentInstanceStartedAfter(processDefinitionKey, since).orElse(null);
        if (processInstanceId == null) {
            return Optional.empty();
        }
        ProcessInstance instance = runtimeExecutionPort.getProcessInstance(processInstanceId)
                .orElseThrow(() -> new IllegalStateException("Instância " + processInstanceId + " não encontrada"));
        Publication publication = publicationRepository.findByJourneyId(journeyId)
                .orElseThrow(() -> new JourneyNotPublishedException(journeyId));
        ExecutionStep step = stepResolver.resolve(processInstanceId);
        return Optional.of(new ExecutionInstance(processInstanceId, instance.businessKey(), publication.getChannelTypes(),
                publication.getFlowNodes(), publication.getFlowConnections(), step, false));
    }
}
