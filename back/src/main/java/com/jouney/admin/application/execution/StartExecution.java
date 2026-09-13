package com.jouney.admin.application.execution;

import com.jouney.admin.domain.channel.ChannelType;
import com.jouney.admin.domain.execution.AnswerConversion;
import com.jouney.admin.domain.execution.ExecutionInstance;
import com.jouney.admin.domain.execution.ExecutionStep;
import com.jouney.admin.domain.execution.KafkaVariableNames;
import com.jouney.admin.domain.execution.ProcessIds;
import com.jouney.admin.domain.execution.SynchronousChainCheck;
import com.jouney.admin.domain.flow.FlowConnection;
import com.jouney.admin.domain.flow.FlowNode;
import com.jouney.admin.domain.flow.FlowNodeType;
import com.jouney.admin.domain.journey.JourneyNotPublishedException;
import com.jouney.admin.domain.publication.Publication;
import com.jouney.admin.domain.publication.PublicationRepository;
import com.jouney.admin.domain.version.JourneyVersion;
import com.jouney.admin.domain.version.JourneyVersionRepository;
import com.jouney.admin.domain.version.VersionStatus;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Inicia uma instância a partir da publicação ativa da jornada, ou de uma versão publicada
 * específica quando o usuário escolhe uma entre várias simultaneamente publicadas
 * (REQ-05.07.007): valida o canal declarado contra os tipos que a jornada atende, e monta as
 * variáveis de início conforme o tipo do nó inicial — START comum coerciona {@code variables}
 * contra o schema declarado (REQ-03.12.003); MESSAGE_START_EVENT ignora {@code variables} e
 * fabrica valores pro outputMapping (equivalente a iniciar sem esperar uma mensagem real — enviar
 * uma mensagem de teste de verdade continua sendo o painel de Kafka manual, {@link
 * SendKafkaMessage}, um recurso à parte pra depois do início). {@code manualKafkaControl} tira
 * todo Service Task Kafka desta instância do piloto automático, exigindo envio manual pra cada um.
 */
@Service
public class StartExecution {

    private final PublicationRepository publicationRepository;
    private final JourneyVersionRepository journeyVersionRepository;
    private final RuntimeExecutionPort runtimeExecutionPort;
    private final ExecutionStepResolver stepResolver;

    public StartExecution(PublicationRepository publicationRepository, JourneyVersionRepository journeyVersionRepository,
                           RuntimeExecutionPort runtimeExecutionPort, ExecutionStepResolver stepResolver) {
        this.publicationRepository = publicationRepository;
        this.journeyVersionRepository = journeyVersionRepository;
        this.runtimeExecutionPort = runtimeExecutionPort;
        this.stepResolver = stepResolver;
    }

    public ExecutionInstance execute(UUID journeyId, String channel, Map<String, Object> variables,
                                      boolean manualKafkaControl, Integer versionNumber) {
        ResolvedTarget target = resolveTarget(journeyId, versionNumber);
        SynchronousChainCheck.verify(target.flowNodes(), target.flowConnections());

        ChannelType channelType = ChannelType.valueOf(channel);
        if (!target.channelTypes().contains(channelType)) {
            throw new UnsupportedChannelException(channel, target.channelTypes());
        }

        FlowNode start = target.flowNodes().stream()
                .filter(n -> n.getType() == FlowNodeType.START || n.getType() == FlowNodeType.MESSAGE_START_EVENT)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Jornada " + journeyId + " não tem nó de início"));

        Map<String, Object> startVariables = new LinkedHashMap<>(start.getType() == FlowNodeType.MESSAGE_START_EVENT
                ? AnswerConversion.fabricateFromOutputMapping(start.getConnectorConfig())
                : AnswerConversion.fromDeclaredVariables(variables, start.getStartVariables()));
        startVariables.put("channel", channelType.name());
        if (manualKafkaControl) {
            // Setado antes do processo existir, não depois de chegar num Service Task Kafka: é o
            // único jeito de garantir que o worker automático (ms-runtime-camunda, roda a cada
            // poucos segundos sem saber se alguém está olhando a tela de Execução) nunca publique
            // sozinho numa instância que o usuário marcou pra controlar na mão.
            startVariables.put(KafkaVariableNames.MANUAL_CONTROL, true);
        }

        String businessKey = UUID.randomUUID().toString();
        // Mesmo antes de iniciar: o motor pode atravessar sozinho um ou mais SERVICE_TASK/GATEWAY
        // na mesma transação do start, antes do primeiro estado de espera — sem a trilha, esses nós
        // nunca apareceriam como visitados no diagrama.
        Instant before = Instant.now();
        String processInstanceId = runtimeExecutionPort.startProcessInstance(
                ProcessIds.keyForJourney(journeyId), startVariables, businessKey, versionNumber);
        ExecutionStep step = stepResolver.resolve(processInstanceId, before);
        return new ExecutionInstance(processInstanceId, businessKey, target.channelTypes(), target.flowNodes(),
                target.flowConnections(), step, manualKafkaControl);
    }

    /** Sem versão explícita: publicação ativa (comportamento de sempre, REQ-05.04.001). Com versão
     * explícita: essa versão precisa estar PUBLISHED — é a única com deployment de verdade no motor
     * pra iniciar contra (REQ-05.07.007). */
    private ResolvedTarget resolveTarget(UUID journeyId, Integer versionNumber) {
        if (versionNumber == null) {
            Publication publication = publicationRepository.findByJourneyId(journeyId)
                    .orElseThrow(() -> new JourneyNotPublishedException(journeyId));
            return new ResolvedTarget(publication.getChannelTypes(), publication.getFlowNodes(), publication.getFlowConnections());
        }
        JourneyVersion version = journeyVersionRepository.findByJourneyId(journeyId).stream()
                .filter(v -> v.getVersionNumber() == versionNumber)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException(
                        "Versão " + versionNumber + " não encontrada para a jornada " + journeyId));
        if (version.getStatus() != VersionStatus.PUBLISHED) {
            throw new IllegalStateException(
                    "Versão " + versionNumber + " da jornada " + journeyId + " não está publicada");
        }
        return new ResolvedTarget(version.getChannelTypes(), version.getFlowNodes(), version.getFlowConnections());
    }

    private record ResolvedTarget(List<ChannelType> channelTypes, List<FlowNode> flowNodes,
                                   List<FlowConnection> flowConnections) {
    }
}
