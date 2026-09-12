package com.jouney.admin.application.diagnostico;

import com.jouney.admin.application.execution.RuntimeExecutionPort;
import com.jouney.admin.application.execution.RuntimeExecutionPort.ActivityHistoryEntry;
import com.jouney.admin.application.execution.RuntimeExecutionPort.HistoricInstance;
import com.jouney.admin.application.execution.RuntimeExecutionPort.TypedVariable;
import com.jouney.admin.application.execution.RuntimeExecutionPort.VariableUpdate;
import com.jouney.admin.domain.diagnostico.ExecutionHistoryDetail;
import com.jouney.admin.domain.diagnostico.HistoryStep;
import com.jouney.admin.domain.diagnostico.IncidentEntry;
import com.jouney.admin.domain.diagnostico.VariableSnapshot;
import com.jouney.admin.domain.diagnostico.VariableTimelineEntry;
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
 * numa linha da busca ({@link SearchExecutionHistory}). Sem depender de
 * {@code application.execution.ExecutionStepResolver} (esse presume instância viva no motor):
 * tudo aqui vem das APIs de história, respondem pra qualquer estado. */
@Service
public class GetExecutionHistoryDetail {

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

        // Variáveis de processo (escopo global) via história — nunca runtime, ao contrário do resto
        // da tela: precisa responder pra qualquer estado (REQ-15.04.001), inclusive instância já
        // terminada. Buscadas uma vez só, alimentam o Kafka-input de cada nó abaixo e os campos
        // `variables`/`variableTimeline` da resposta.
        Map<String, TypedVariable> currentValues = runtimeExecutionPort.getHistoricProcessVariables(processInstanceId);

        List<HistoryStep> steps = new ArrayList<>();
        Map<String, FlowNode> nodeByActivityInstanceId = new LinkedHashMap<>();
        String currentNodeId = null;
        for (ActivityHistoryEntry activity : runtimeExecutionPort.getFullActivityHistory(processInstanceId)) {
            FlowNode node = resolved.flowNodes().stream()
                    .filter(n -> n.getId().equals(activity.activityId()))
                    .findFirst().orElse(null);
            if (node == null) {
                // Nó não encontrado na versão resolvida (deploy legado sem versionTag correlacionável)
                // — mostra o passo mesmo assim, só sem input/output.
                steps.add(new HistoryStep(activity.activityId(), activity.activityName(), activity.activityType(),
                        activity.startTime(), activity.endTime(), activity.durationInMillis(), null, null));
                if (activity.endTime() == null) {
                    currentNodeId = activity.activityId();
                }
                continue;
            }
            nodeByActivityInstanceId.put(activity.id(), node);
            Map<String, Object> input = null;
            Map<String, Object> output = null;
            if (node.getType() == FlowNodeType.USER_TASK) {
                Map<String, Object> answers = runtimeExecutionPort.getSubmittedFormValues(activity.id());
                input = answers.isEmpty() ? null : answers;
            } else if (node.getType() == FlowNodeType.START) {
                // "Entrada" do Início = as variáveis declaradas (REQ-03.12.001) com o valor que de
                // fato chegou ao iniciar a instância — mesmo dado que StartVariablesSection já lia
                // no front (por nome, contra a lista de variáveis), só que resolvido aqui agora que
                // o Início passa a ser um HistoryStep normal, com Entrada/Saída como qualquer outro.
                input = startInput(node, currentValues);
            } else if (node.getType() == FlowNodeType.SERVICE_TASK || node.getType() == FlowNodeType.RECEIVE_TASK) {
                ConnectorConfig connectorConfig = node.getConnectorConfig();
                if (connectorConfig != null && connectorConfig.getConnectorType() == ConnectorType.REST) {
                    Map<String, Object> local = runtimeExecutionPort.getLocalVariablesForActivity(activity.id());
                    input = restInput(local);
                    output = restOutput(local);
                } else if (connectorConfig != null && connectorConfig.getConnectorType() == ConnectorType.KAFKA) {
                    input = kafkaInput(currentValues, node.getId());
                }
            }
            steps.add(new HistoryStep(node.getId(), node.getName(), node.getType().name(), activity.startTime(),
                    activity.endTime(), activity.durationInMillis(), input, output));
            if (activity.endTime() == null) {
                currentNodeId = node.getId();
            }
        }

        List<VariableSnapshot> variables = currentValues.entrySet().stream()
                .filter(e -> !isInternalVariableName(e.getKey()))
                .map(e -> new VariableSnapshot(e.getKey(), e.getValue().value(), e.getValue().type()))
                .toList();

        List<VariableTimelineEntry> variableTimeline = runtimeExecutionPort.getVariableUpdateHistory(processInstanceId).stream()
                .filter(u -> currentValues.containsKey(u.name()))
                .map(u -> {
                    FlowNode node = nodeByActivityInstanceId.get(u.activityInstanceId());
                    return new VariableTimelineEntry(u.name(), u.value(), u.type(),
                            node != null ? node.getId() : null, node != null ? node.getName() : null, u.time());
                })
                .toList();

        List<IncidentEntry> incidents = runtimeExecutionPort.getHistoricIncidents(processInstanceId).stream()
                .map(i -> {
                    FlowNode node = resolved.flowNodes().stream()
                            .filter(n -> n.getId().equals(i.nodeId()))
                            .findFirst().orElse(null);
                    return new IncidentEntry(i.nodeId(), node != null ? node.getName() : null, i.incidentType(),
                            i.message(), i.createTime(), i.endTime(), i.open());
                })
                .toList();

        return new ExecutionHistoryDetail(instance.id(), instance.businessKey(), journeyId, resolved.journeyName(),
                resolved.versionNumber(), instance.state(), instance.startTime(), instance.endTime(),
                instance.durationInMillis(), resolved.channelTypes(), resolved.flowNodes(), resolved.flowConnections(),
                steps, variables, variableTimeline, incidents, currentNodeId);
    }

    // Mesmos nomes reservados de KafkaVariableNames (todos com o prefixo "__") — técnicos, nunca
    // devem aparecer como variável de processo comum na aba Variáveis do Diagnóstico.
    private static boolean isInternalVariableName(String name) {
        return name.startsWith("__");
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

    private static Map<String, Object> kafkaInput(Map<String, TypedVariable> processVariables, String nodeId) {
        Map<String, Object> input = new LinkedHashMap<>();
        putIfPresent(input, "topic", valueOf(processVariables, KafkaVariableNames.TOPIC_PREFIX + nodeId));
        putIfPresent(input, "payload", valueOf(processVariables, KafkaVariableNames.PAYLOAD_PREFIX + nodeId));
        return input.isEmpty() ? null : input;
    }

    private static Object valueOf(Map<String, TypedVariable> variables, String name) {
        TypedVariable v = variables.get(name);
        return v != null ? v.value() : null;
    }

    private static Map<String, Object> startInput(FlowNode node, Map<String, TypedVariable> currentValues) {
        List<Map<String, Object>> declared = node.getStartVariables();
        if (declared == null || declared.isEmpty()) {
            return null;
        }
        Map<String, Object> input = new LinkedHashMap<>();
        for (Map<String, Object> declaration : declared) {
            if (declaration.get("name") instanceof String name) {
                putIfPresent(input, name, valueOf(currentValues, name));
            }
        }
        return input.isEmpty() ? null : input;
    }

    private static void putIfPresent(Map<String, Object> map, String key, Object value) {
        if (value != null) {
            map.put(key, value);
        }
    }
}
