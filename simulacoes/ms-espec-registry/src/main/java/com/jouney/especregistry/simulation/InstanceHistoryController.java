package com.jouney.especregistry.simulation;

import com.jouney.especregistry.adminback.AdminBackClient;
import com.jouney.especregistry.adminback.ConnectorConfig;
import com.jouney.especregistry.adminback.FlowNode;
import com.jouney.especregistry.adminback.JourneyVersionResponse;
import com.jouney.especregistry.adminback.PublicationSnapshot;
import com.jouney.especregistry.camunda.CamundaClient;
import com.jouney.especregistry.camunda.CamundaVariable;
import com.jouney.especregistry.camunda.HistoricActivityInstance;
import com.jouney.especregistry.camunda.HistoricProcessInstance;
import com.jouney.especregistry.camunda.ProcessIds;
import com.jouney.especregistry.kafka.KafkaMessagePublisher;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Consultas de histórico de instâncias — a aba "Histórico" da tela Execução & Diagnóstico. Ao
 * contrário de {@link SimulationController} (execução ao vivo, via tabelas de runtime do Camunda),
 * tudo aqui vem das APIs de história (/history/*), que respondem pra qualquer instância, ativa ou já
 * terminada — por isso não depende de {@link StepResolver} nem passa por
 * {@link SynchronousChainCheck} (esse guard só protege endpoints que avançam a execução).
 */
@RestController
@RequestMapping("/api/v1/instances")
public class InstanceHistoryController {

    private static final int SEARCH_MAX_RESULTS = 500;

    private final CamundaClient camundaClient;
    private final AdminBackClient adminBackClient;

    public InstanceHistoryController(CamundaClient camundaClient, AdminBackClient adminBackClient) {
        this.camundaClient = camundaClient;
        this.adminBackClient = adminBackClient;
    }

    @GetMapping("/search")
    public List<HistoricInstanceSummary> search(@RequestParam(required = false) UUID journeyId,
                                                 @RequestParam(required = false) String businessKey,
                                                 @RequestParam(required = false) Boolean finished,
                                                 @RequestParam(required = false) Instant startedFrom,
                                                 @RequestParam(required = false) Instant startedTo) {
        String processDefinitionKey = journeyId != null ? ProcessIds.keyForJourney(journeyId) : null;
        return camundaClient
                .searchHistoricInstances(processDefinitionKey, businessKey, startedFrom, startedTo, finished, SEARCH_MAX_RESULTS)
                .stream()
                .map(p -> new HistoricInstanceSummary(p.id(), p.businessKey(), p.processDefinitionName(),
                        p.startTime(), p.endTime(), p.durationInMillis(), p.state()))
                .toList();
    }

    @GetMapping("/{processInstanceId}/history")
    public InstanceHistoryResponse history(@PathVariable String processInstanceId) {
        HistoricProcessInstance instance = camundaClient.getHistoricProcessInstance(processInstanceId)
                .orElseThrow(() -> new IllegalStateException("Instância " + processInstanceId + " não encontrada no histórico"));
        UUID journeyId = ProcessIds.journeyIdFromKey(instance.processDefinitionKey());
        ResolvedSnapshot resolved = resolveSnapshot(journeyId, instance.processDefinitionId());

        List<HistoryStep> steps = new ArrayList<>();
        // Variáveis de processo (usadas só pelo conector Kafka, prefixadas por nó) — buscadas no
        // máximo uma vez, na primeira atividade Kafka encontrada, igual ao cache lazy que
        // SimulationController.trailSince já faz pro mesmo propósito.
        Map<String, CamundaVariable> processVariables = null;
        for (HistoricActivityInstance activity : camundaClient.getFullActivityHistory(processInstanceId)) {
            // Mesmo critério de "nó de fronteira" que SimulationController.trailSince usa: o START
            // não é um passo navegável de verdade, só o ponto de partida do fluxo.
            if ("startEvent".equals(activity.activityType())) {
                continue;
            }
            Optional<FlowNode> nodeOpt = resolved.snapshot().findNode(activity.activityId());
            if (nodeOpt.isEmpty()) {
                // Nó não encontrado no snapshot resolvido (deploy legado sem versionTag correlacionável,
                // ver "Fora de escopo" do plano) — ainda assim mostra o passo, só sem input/output.
                steps.add(new HistoryStep(activity.activityId(), activity.activityName(), activity.activityType(),
                        activity.startTime(), activity.endTime(), activity.durationInMillis(), null, null));
                continue;
            }
            FlowNode node = nodeOpt.get();
            Map<String, Object> input = null;
            Map<String, Object> output = null;
            if ("USER_TASK".equals(node.type())) {
                Map<String, Object> answers = camundaClient.getSubmittedFormValues(activity.id());
                input = answers.isEmpty() ? null : answers;
            } else if ("SERVICE_TASK".equals(node.type()) || "RECEIVE_TASK".equals(node.type())) {
                ConnectorConfig connectorConfig = node.connectorConfig();
                if (connectorConfig != null && "REST".equalsIgnoreCase(connectorConfig.connectorType())) {
                    Map<String, CamundaVariable> local = camundaClient.getLocalVariablesForActivity(activity.id());
                    input = restInput(local);
                    output = restOutput(local);
                } else if (connectorConfig != null && "KAFKA".equalsIgnoreCase(connectorConfig.connectorType())) {
                    if (processVariables == null) {
                        processVariables = camundaClient.getProcessVariables(processInstanceId);
                    }
                    input = kafkaInput(processVariables, node.id());
                }
            }
            steps.add(new HistoryStep(node.id(), node.name(), node.type(), activity.startTime(), activity.endTime(),
                    activity.durationInMillis(), input, output));
        }

        return new InstanceHistoryResponse(instance.id(), instance.businessKey(), journeyId,
                resolved.snapshot().journeyName(), resolved.versionNumber(), instance.state(), instance.startTime(),
                instance.endTime(), instance.durationInMillis(), FlowBundle.from(resolved.snapshot()), steps);
    }

    /** Resolve o snapshot da versão que RODOU de fato (via {@code versionTag}, ver
     * CamundaClient#getProcessDefinitionVersionTag), não a versão atualmente publicada — só cai no
     * snapshot atual se o deploy não tiver versionTag ou a versão não existir mais em admin/back
     * (não deve acontecer pra nada publicado com o BpmnTransformer como está hoje). */
    private ResolvedSnapshot resolveSnapshot(UUID journeyId, String processDefinitionId) {
        Integer versionNumber = camundaClient.getProcessDefinitionVersionTag(processDefinitionId)
                .flatMap(InstanceHistoryController::parseVersionNumber)
                .orElse(null);
        if (versionNumber != null) {
            Optional<JourneyVersionResponse> match = adminBackClient.listVersions(journeyId).stream()
                    .filter(v -> v.versionNumber() == versionNumber)
                    .findFirst();
            if (match.isPresent()) {
                return new ResolvedSnapshot(adminBackClient.getVersionSnapshot(journeyId, match.get().versionId()), versionNumber);
            }
        }
        return new ResolvedSnapshot(adminBackClient.getPublicationSnapshot(journeyId), versionNumber);
    }

    private static Optional<Integer> parseVersionNumber(String versionTag) {
        if (versionTag == null || !versionTag.startsWith("v")) {
            return Optional.empty();
        }
        try {
            return Optional.of(Integer.parseInt(versionTag.substring(1)));
        } catch (NumberFormatException e) {
            return Optional.empty();
        }
    }

    private record ResolvedSnapshot(PublicationSnapshot snapshot, Integer versionNumber) {
    }

    private static Map<String, Object> restInput(Map<String, CamundaVariable> local) {
        Map<String, Object> input = new LinkedHashMap<>();
        putIfPresent(input, "method", local.get("method"));
        putIfPresent(input, "url", local.get("url"));
        putIfPresent(input, "headers", local.get("headers"));
        putIfPresent(input, "body", local.get("payload"));
        return input.isEmpty() ? null : input;
    }

    private static Map<String, Object> restOutput(Map<String, CamundaVariable> local) {
        CamundaVariable response = local.get("response");
        return response != null && response.value() != null ? Map.of("response", response.value()) : null;
    }

    private static Map<String, Object> kafkaInput(Map<String, CamundaVariable> processVariables, String nodeId) {
        Map<String, Object> input = new LinkedHashMap<>();
        putIfPresent(input, "topic", processVariables.get(KafkaMessagePublisher.KAFKA_TOPIC_VAR_PREFIX + nodeId));
        putIfPresent(input, "payload", processVariables.get(KafkaMessagePublisher.KAFKA_PAYLOAD_VAR_PREFIX + nodeId));
        return input.isEmpty() ? null : input;
    }

    private static void putIfPresent(Map<String, Object> map, String key, CamundaVariable variable) {
        if (variable != null && variable.value() != null) {
            map.put(key, variable.value());
        }
    }
}
