package com.jouney.admin.application.execution;

import com.jouney.admin.application.execution.RuntimeExecutionPort.ActiveTask;
import com.jouney.admin.application.execution.RuntimeExecutionPort.ActivityHistoryEntry;
import com.jouney.admin.application.execution.RuntimeExecutionPort.LeafActivity;
import com.jouney.admin.application.execution.RuntimeExecutionPort.ProcessInstance;
import com.jouney.admin.domain.execution.ExecutionStep;
import com.jouney.admin.domain.execution.FlowGraph;
import com.jouney.admin.domain.execution.KafkaVariableNames;
import com.jouney.admin.domain.execution.ProcessIds;
import com.jouney.admin.domain.execution.ResolvedForm;
import com.jouney.admin.domain.execution.TrailEntry;
import com.jouney.admin.domain.flow.ConnectorConfig;
import com.jouney.admin.domain.flow.ConnectorType;
import com.jouney.admin.domain.flow.FlowNode;
import com.jouney.admin.domain.flow.FlowNodeType;
import com.jouney.admin.domain.version.JourneyVersion;
import com.jouney.admin.domain.version.JourneyVersionRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Dado um processInstanceId, descobre o que o usuário deve ver agora — cruzando "o que o motor
 * diz" (task/atividade ativa, {@link RuntimeExecutionPort}) com "o que a jornada diz" (nome/tipo
 * do nó, direto do repositório de versões — sem round-trip HTTP, o admin/back já é dono desse
 * dado) e "o que a tela diz" (formulário resolvido pelo ms-espec-registry, {@link
 * FormResolutionPort}). Mesmo algoritmo do {@code StepResolver} (ms-espec-registry) e do {@code
 * JourneyStepResolver} (ms-journey): getProcessInstance → tasks ativas → senão leaf activity.
 */
@Service
public class ExecutionStepResolver {

    // Nós que o motor atravessou sozinho desde `since` — só entram atividades já concluídas
    // (endTime != null); o próprio passo atual novo ainda não tem endTime nesse ponto.
    private static final String BOUNDARY_ACTIVITY_TYPE = "startEvent";

    private final RuntimeExecutionPort runtimeExecutionPort;
    private final FormResolutionPort formResolutionPort;
    private final JourneyVersionRepository journeyVersionRepository;

    public ExecutionStepResolver(RuntimeExecutionPort runtimeExecutionPort, FormResolutionPort formResolutionPort,
                                  JourneyVersionRepository journeyVersionRepository) {
        this.runtimeExecutionPort = runtimeExecutionPort;
        this.formResolutionPort = formResolutionPort;
        this.journeyVersionRepository = journeyVersionRepository;
    }

    public ExecutionStep resolve(String processInstanceId) {
        return resolve(processInstanceId, null);
    }

    /** {@code since} presente pede pra trilha do que o motor atravessou sozinho vir junto — usado
     * logo após iniciar/completar uma ação, e no polling de um passo WAITING (pra flagrar o worker
     * Kafka publicando em segundo plano). */
    public ExecutionStep resolve(String processInstanceId, Instant since) {
        ProcessInstance instance = runtimeExecutionPort.getProcessInstance(processInstanceId).orElse(null);
        if (instance == null) {
            return ExecutionStep.ended();
        }
        UUID journeyId = ProcessIds.journeyIdFromKey(instance.definitionKey());
        int versionNumber = versionNumberOf(instance);
        JourneyVersion version = version(journeyId, versionNumber);

        ExecutionStep step = resolveStep(processInstanceId, journeyId, versionNumber, version);
        return since != null ? step.withTrail(buildTrail(processInstanceId, version, since)) : step;
    }

    private ExecutionStep resolveStep(String processInstanceId, UUID journeyId, int versionNumber, JourneyVersion version) {
        List<ActiveTask> tasks = runtimeExecutionPort.findActiveUserTasks(processInstanceId);
        if (!tasks.isEmpty()) {
            ActiveTask task = tasks.get(0);
            Map<String, Object> variables = runtimeExecutionPort.getProcessVariables(processInstanceId);
            ResolvedForm form = formResolutionPort.resolveForm(journeyId, versionNumber, task.taskDefinitionKey(), variables);
            return ExecutionStep.userTask(task.id(), task.taskDefinitionKey(), task.name(), form);
        }

        LeafActivity leaf = runtimeExecutionPort.findLeafActivity(processInstanceId)
                .orElseThrow(() -> new IllegalStateException("Nenhum passo ativo encontrado para a instância " + processInstanceId));
        FlowNode node = findNode(version, leaf.activityId());
        return ExecutionStep.waiting(node.getId(), node.getName(), node.getType().name());
    }

    private List<TrailEntry> buildTrail(String processInstanceId, JourneyVersion version, Instant since) {
        List<TrailEntry> trail = new ArrayList<>();
        Map<String, Object> processVariables = null;
        for (ActivityHistoryEntry activity : runtimeExecutionPort.getActivityHistorySince(processInstanceId, since)) {
            if (activity.endTime() == null || BOUNDARY_ACTIVITY_TYPE.equals(activity.activityType())) {
                continue;
            }
            FlowNode node = version.getFlowNodes().stream()
                    .filter(n -> n.getId().equals(activity.activityId()))
                    .findFirst().orElse(null);
            if (node == null) {
                continue;
            }
            String url = null, response = null, method = null, requestHeaders = null, requestBody = null,
                    kafkaTopic = null, kafkaPayload = null;
            if (node.getType() == FlowNodeType.SERVICE_TASK) {
                ConnectorConfig connectorConfig = node.getConnectorConfig();
                if (connectorConfig != null && connectorConfig.getConnectorType() == ConnectorType.REST) {
                    // HttpConnectorDelegate (ms-runtime-camunda) grava url/method/headers/payload/response
                    // como variável local da própria activity instance — escopo por nó, nunca colide
                    // entre SERVICE_TASKs REST diferentes.
                    Map<String, Object> local = runtimeExecutionPort.getLocalVariablesForActivity(activity.id());
                    url = stringValue(local.get("url"));
                    method = stringValue(local.get("method"));
                    requestHeaders = stringValue(local.get("headers"));
                    requestBody = stringValue(local.get("payload"));
                    response = stringValue(local.get("response"));
                } else {
                    if (processVariables == null) {
                        processVariables = runtimeExecutionPort.getProcessVariables(processInstanceId);
                    }
                    kafkaTopic = stringValue(processVariables.get(KafkaVariableNames.TOPIC_PREFIX + node.getId()));
                    kafkaPayload = stringValue(processVariables.get(KafkaVariableNames.PAYLOAD_PREFIX + node.getId()));
                }
            }
            trail.add(new TrailEntry(node.getId(), node.getName(), node.getType().name(), url, response, method,
                    requestHeaders, requestBody, kafkaTopic, kafkaPayload));
        }
        return trail;
    }

    private static String stringValue(Object value) {
        return value != null ? String.valueOf(value) : null;
    }

    /** Versão que a instância está rodando agora — usado pela heurística de atribuição de erro,
     * que precisa andar pelo grafo de nós/conexões da MESMA versão que a instância. */
    public JourneyVersion versionOf(String processInstanceId) {
        ProcessInstance instance = runtimeExecutionPort.getProcessInstance(processInstanceId)
                .orElseThrow(() -> new IllegalStateException("Instância de processo não encontrada: " + processInstanceId));
        UUID journeyId = ProcessIds.journeyIdFromKey(instance.definitionKey());
        return version(journeyId, versionNumberOf(instance));
    }

    public int versionNumberOf(ProcessInstance instance) {
        String tag = runtimeExecutionPort.getVersionTag(instance.definitionId());
        return Integer.parseInt(tag.substring(1));
    }

    public JourneyVersion version(UUID journeyId, int versionNumber) {
        return journeyVersionRepository.findByJourneyId(journeyId).stream()
                .filter(v -> v.getVersionNumber() == versionNumber)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Versão " + versionNumber + " não encontrada para a jornada " + journeyId));
    }

    public FlowNode findNode(JourneyVersion version, String nodeId) {
        return version.getFlowNodes().stream()
                .filter(n -> n.getId().equals(nodeId))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Nó " + nodeId + " não encontrado na versão "
                        + version.getVersionNumber() + " da jornada " + version.getJourneyId()));
    }

    /** Melhor hipótese de onde uma falha síncrona aconteceu (ver {@link FlowGraph}), a partir do nó
     * atual de uma instância já resolvida. */
    public Optional<FlowNode> nextConnectorNodeAfter(JourneyVersion version, String nodeId) {
        return FlowGraph.nextConnectorNodeAfter(nodeId, version.getFlowNodes(), version.getFlowConnections());
    }
}
