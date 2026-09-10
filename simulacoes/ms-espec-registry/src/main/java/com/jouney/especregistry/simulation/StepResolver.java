package com.jouney.especregistry.simulation;

import com.jouney.especregistry.adminback.AdminBackClient;
import com.jouney.especregistry.adminback.FlowNode;
import com.jouney.especregistry.adminback.PublicationSnapshot;
import com.jouney.especregistry.camunda.ActivityInstanceNode;
import com.jouney.especregistry.camunda.CamundaClient;
import com.jouney.especregistry.camunda.CamundaVariable;
import com.jouney.especregistry.camunda.ProcessIds;
import com.jouney.especregistry.camunda.ProcessInstanceInfo;
import com.jouney.especregistry.camunda.TaskInfo;
import com.jouney.especregistry.sdui.CanonicalSdui;
import com.jouney.especregistry.sdui.SduiScreenEnvelope;
import com.jouney.especregistry.sdui.SnapshotRepository;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * Função central reaproveitada por start/complete/simulate: dado um processInstanceId, descobre o
 * que o simulador deve mostrar agora — uma User Task com seu formulário SDUI, um passo
 * SERVICE_TASK/RECEIVE_TASK aguardando "Simular conclusão", ou o fim do processo. O resto do fluxo
 * (nome/tipo do nó e conectores) continua vindo do admin/back — a árvore obrigatória da tela de
 * uma User Task vem do Strapi (snapshot publicado, seção 15 do catálogo), via
 * SnapshotRepository (journeyId + screenId=node.id()).
 */
@Component
public class StepResolver {

    private final CamundaClient camundaClient;
    private final AdminBackClient adminBackClient;
    private final SnapshotRepository snapshotRepository;

    public StepResolver(CamundaClient camundaClient, AdminBackClient adminBackClient, SnapshotRepository snapshotRepository) {
        this.camundaClient = camundaClient;
        this.adminBackClient = adminBackClient;
        this.snapshotRepository = snapshotRepository;
    }

    public StepResponse resolve(String processInstanceId) {
        ProcessInstanceInfo instance = camundaClient.getProcessInstance(processInstanceId).orElse(null);
        if (instance == null) {
            return StepResponse.ended();
        }
        UUID journeyId = ProcessIds.journeyIdFromKey(instance.definitionKey());
        int journeyVersion = journeyVersion(instance);

        List<TaskInfo> tasks = camundaClient.findActiveUserTasks(processInstanceId);
        if (!tasks.isEmpty()) {
            return resolveUserTask(journeyId, journeyVersion, tasks.get(0), processInstanceId);
        }

        ActivityInstanceNode leaf = camundaClient.findLeafActivity(processInstanceId)
                .orElseThrow(() -> new IllegalStateException("Nenhum passo ativo encontrado para a instância " + processInstanceId));
        PublicationSnapshot snapshot = adminBackClient.getVersionSnapshot(journeyId, journeyVersion);
        FlowNode node = snapshot.findNode(leaf.activityId())
                .orElseThrow(() -> new IllegalStateException("Nó " + leaf.activityId() + " não encontrado no snapshot da jornada"));
        return StepResponse.waiting(node.id(), node.name(), node.type());
    }

    private StepResponse resolveUserTask(UUID journeyId, int journeyVersion, TaskInfo task, String processInstanceId) {
        PublicationSnapshot snapshot = adminBackClient.getVersionSnapshot(journeyId, journeyVersion);
        FlowNode node = snapshot.findNode(task.taskDefinitionKey())
                .orElseThrow(() -> new IllegalStateException("Nó " + task.taskDefinitionKey() + " não encontrado no snapshot da jornada"));
        if (!node.hasEmbeddedScreen()) {
            throw new IllegalStateException("A Tarefa de Usuário " + node.id() + " não possui tela publicada");
        }
        SduiScreenEnvelope envelope = snapshotRepository.findPublished(journeyId, journeyVersion, node.id())
                .orElseThrow(() -> new IllegalStateException("Nó " + node.id()
                        + " tem tela desenhada mas nenhum snapshot publicado foi encontrado no Strapi"));
        CanonicalSdui.validateEnvelope(envelope);
        Map<String, CamundaVariable> variables = camundaClient.getProcessVariables(processInstanceId);
        Map<String, Object> values = new java.util.LinkedHashMap<>();
        CanonicalSdui.referencedProcessVariables(envelope.data()).forEach(name -> {
            CamundaVariable variable = variables.get(name);
            if (variable != null) values.put(name, variable.value());
        });
        Map<String, Object> context = Map.of("form", values, "data", values, "session", Map.of(),
                "route", Map.of(), "computed", Map.of());
        return StepResponse.userTask(task.id(), task.taskDefinitionKey(), task.name(),
                new FormPayload(null, node.name(), null, envelope, context));
    }

    private int journeyVersion(ProcessInstanceInfo instance) {
        String tag = camundaClient.getProcessDefinitionVersionTag(instance.definitionId())
                .orElseThrow(() -> new IllegalStateException("Definição sem versão de jornada"));
        if (!tag.startsWith("v")) throw new IllegalStateException("Versão de jornada inválida: " + tag);
        return Integer.parseInt(tag.substring(1));
    }

}
