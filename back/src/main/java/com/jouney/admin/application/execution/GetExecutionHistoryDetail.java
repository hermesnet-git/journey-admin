package com.jouney.admin.application.execution;

import com.jouney.admin.application.execution.RuntimeExecutionPort.ActivityHistoryEntry;
import com.jouney.admin.application.execution.RuntimeExecutionPort.HistoricInstance;
import com.jouney.admin.domain.execution.ExecutionHistoryDetail;
import com.jouney.admin.domain.execution.HistoryStep;
import com.jouney.admin.domain.execution.KafkaVariableNames;
import com.jouney.admin.domain.execution.ProcessIds;
import com.jouney.admin.domain.flow.ConnectorConfig;
import com.jouney.admin.domain.flow.ConnectorType;
import com.jouney.admin.domain.flow.FlowNode;
import com.jouney.admin.domain.flow.FlowNodeType;
import com.jouney.admin.domain.publication.Publication;
import com.jouney.admin.domain.publication.PublicationRepository;
import com.jouney.admin.domain.version.JourneyVersion;
import com.jouney.admin.domain.version.JourneyVersionRepository;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

/** Detalhe completo de uma instância no histórico — a aba "Histórico" do Diagnóstico, ao clicar
 * numa linha da busca ({@link SearchExecutionHistory}). Sem depender de {@link
 * ExecutionStepResolver} (esse presume instância viva no motor): tudo aqui vem das APIs de
 * história, respondem pra qualquer estado. */
@Service
public class GetExecutionHistoryDetail {

    private static final String BOUNDARY_ACTIVITY_TYPE = "startEvent";

    private final RuntimeExecutionPort runtimeExecutionPort;
    private final JourneyVersionRepository journeyVersionRepository;
    private final PublicationRepository publicationRepository;

    public GetExecutionHistoryDetail(RuntimeExecutionPort runtimeExecutionPort,
                                      JourneyVersionRepository journeyVersionRepository,
                                      PublicationRepository publicationRepository) {
        this.runtimeExecutionPort = runtimeExecutionPort;
        this.journeyVersionRepository = journeyVersionRepository;
        this.publicationRepository = publicationRepository;
    }

    public ExecutionHistoryDetail execute(String processInstanceId) {
        HistoricInstance instance = runtimeExecutionPort.getHistoricProcessInstance(processInstanceId)
                .orElseThrow(() -> new IllegalStateException("Instância " + processInstanceId + " não encontrada no histórico"));
        UUID journeyId = ProcessIds.journeyIdFromKey(instance.processDefinitionKey());
        ResolvedFlow resolved = resolveFlow(journeyId, instance.processDefinitionId());

        List<HistoryStep> steps = new ArrayList<>();
        // Variáveis de processo (só usadas pelo conector Kafka, prefixadas por nó) — buscadas no
        // máximo uma vez, na primeira atividade Kafka encontrada.
        Map<String, Object> processVariables = null;
        for (ActivityHistoryEntry activity : runtimeExecutionPort.getFullActivityHistory(processInstanceId)) {
            if (BOUNDARY_ACTIVITY_TYPE.equals(activity.activityType())) {
                continue;
            }
            FlowNode node = resolved.flowNodes().stream()
                    .filter(n -> n.getId().equals(activity.activityId()))
                    .findFirst().orElse(null);
            if (node == null) {
                // Nó não encontrado na versão resolvida (deploy legado sem versionTag correlacionável)
                // — mostra o passo mesmo assim, só sem input/output.
                steps.add(new HistoryStep(activity.activityId(), activity.activityName(), activity.activityType(),
                        activity.startTime(), activity.endTime(), activity.durationInMillis(), null, null));
                continue;
            }
            Map<String, Object> input = null;
            Map<String, Object> output = null;
            if (node.getType() == FlowNodeType.USER_TASK) {
                Map<String, Object> answers = runtimeExecutionPort.getSubmittedFormValues(activity.id());
                input = answers.isEmpty() ? null : answers;
            } else if (node.getType() == FlowNodeType.SERVICE_TASK || node.getType() == FlowNodeType.RECEIVE_TASK) {
                ConnectorConfig connectorConfig = node.getConnectorConfig();
                if (connectorConfig != null && connectorConfig.getConnectorType() == ConnectorType.REST) {
                    Map<String, Object> local = runtimeExecutionPort.getLocalVariablesForActivity(activity.id());
                    input = restInput(local);
                    output = restOutput(local);
                } else if (connectorConfig != null && connectorConfig.getConnectorType() == ConnectorType.KAFKA) {
                    if (processVariables == null) {
                        processVariables = runtimeExecutionPort.getProcessVariables(processInstanceId);
                    }
                    input = kafkaInput(processVariables, node.getId());
                }
            }
            steps.add(new HistoryStep(node.getId(), node.getName(), node.getType().name(), activity.startTime(),
                    activity.endTime(), activity.durationInMillis(), input, output));
        }

        return new ExecutionHistoryDetail(instance.id(), instance.businessKey(), journeyId, resolved.journeyName(),
                resolved.versionNumber(), instance.state(), instance.startTime(), instance.endTime(),
                instance.durationInMillis(), resolved.channelTypes(), resolved.flowNodes(), resolved.flowConnections(), steps);
    }

    /** Resolve a versão que RODOU de fato (via versionTag do process-definition), não a atualmente
     * publicada — só cai na publicação ativa se o deploy não tiver versionTag ou a versão não
     * existir mais em admin/back. */
    private ResolvedFlow resolveFlow(UUID journeyId, String processDefinitionId) {
        Integer versionNumber = parseVersionNumber(safeVersionTag(processDefinitionId));
        if (versionNumber != null) {
            JourneyVersion match = journeyVersionRepository.findByJourneyId(journeyId).stream()
                    .filter(v -> v.getVersionNumber() == versionNumber)
                    .findFirst().orElse(null);
            if (match != null) {
                return new ResolvedFlow(match.getJourneyName(), versionNumber, match.getChannelTypes(),
                        match.getFlowNodes(), match.getFlowConnections());
            }
        }
        Publication publication = publicationRepository.findByJourneyId(journeyId)
                .orElseThrow(() -> new IllegalStateException("Jornada " + journeyId + " não tem publicação ativa nem versão correlacionável"));
        return new ResolvedFlow(publication.getJourneyName(), versionNumber, publication.getChannelTypes(),
                publication.getFlowNodes(), publication.getFlowConnections());
    }

    private String safeVersionTag(String processDefinitionId) {
        try {
            return runtimeExecutionPort.getVersionTag(processDefinitionId);
        } catch (RuntimeException e) {
            return null;
        }
    }

    private static Integer parseVersionNumber(String versionTag) {
        if (versionTag == null || !versionTag.startsWith("v")) {
            return null;
        }
        try {
            return Integer.parseInt(versionTag.substring(1));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private record ResolvedFlow(String journeyName, Integer versionNumber,
                                 List<com.jouney.admin.domain.channel.ChannelType> channelTypes,
                                 List<FlowNode> flowNodes, List<com.jouney.admin.domain.flow.FlowConnection> flowConnections) {
    }

    private static Map<String, Object> restInput(Map<String, Object> local) {
        Map<String, Object> input = new LinkedHashMap<>();
        putIfPresent(input, "method", local.get("method"));
        putIfPresent(input, "url", local.get("url"));
        putIfPresent(input, "headers", local.get("headers"));
        putIfPresent(input, "body", local.get("payload"));
        return input.isEmpty() ? null : input;
    }

    private static Map<String, Object> restOutput(Map<String, Object> local) {
        Object response = local.get("response");
        return response != null ? Map.of("response", response) : null;
    }

    private static Map<String, Object> kafkaInput(Map<String, Object> processVariables, String nodeId) {
        Map<String, Object> input = new LinkedHashMap<>();
        putIfPresent(input, "topic", processVariables.get(KafkaVariableNames.TOPIC_PREFIX + nodeId));
        putIfPresent(input, "payload", processVariables.get(KafkaVariableNames.PAYLOAD_PREFIX + nodeId));
        return input.isEmpty() ? null : input;
    }

    private static void putIfPresent(Map<String, Object> map, String key, Object value) {
        if (value != null) {
            map.put(key, value);
        }
    }
}
