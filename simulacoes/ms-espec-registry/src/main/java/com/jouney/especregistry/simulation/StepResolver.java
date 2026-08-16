package com.jouney.especregistry.simulation;

import com.jouney.especregistry.adminback.AdminBackClient;
import com.jouney.especregistry.adminback.FlowNode;
import com.jouney.especregistry.adminback.FormSnapshot;
import com.jouney.especregistry.adminback.PublicationSnapshot;
import com.jouney.especregistry.camunda.ActivityInstanceNode;
import com.jouney.especregistry.camunda.CamundaClient;
import com.jouney.especregistry.camunda.ProcessIds;
import com.jouney.especregistry.camunda.ProcessInstanceInfo;
import com.jouney.especregistry.camunda.TaskInfo;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * Função central reaproveitada por start/complete/simulate: dado um processInstanceId, descobre o
 * que o simulador deve mostrar agora — uma User Task com seu formulário SDUI, um passo
 * SERVICE_TASK/RECEIVE_TASK aguardando "Simular conclusão", ou o fim do processo.
 */
@Component
public class StepResolver {

    private final CamundaClient camundaClient;
    private final AdminBackClient adminBackClient;

    public StepResolver(CamundaClient camundaClient, AdminBackClient adminBackClient) {
        this.camundaClient = camundaClient;
        this.adminBackClient = adminBackClient;
    }

    public StepResponse resolve(String processInstanceId) {
        ProcessInstanceInfo instance = camundaClient.getProcessInstance(processInstanceId).orElse(null);
        if (instance == null) {
            return StepResponse.ended();
        }
        UUID journeyId = ProcessIds.journeyIdFromKey(instance.definitionKey());

        List<TaskInfo> tasks = camundaClient.findActiveUserTasks(processInstanceId);
        if (!tasks.isEmpty()) {
            return resolveUserTask(journeyId, tasks.get(0));
        }

        ActivityInstanceNode leaf = camundaClient.findLeafActivity(processInstanceId)
                .orElseThrow(() -> new IllegalStateException("Nenhum passo ativo encontrado para a instância " + processInstanceId));
        PublicationSnapshot snapshot = adminBackClient.getPublicationSnapshot(journeyId);
        FlowNode node = snapshot.findNode(leaf.activityId())
                .orElseThrow(() -> new IllegalStateException("Nó " + leaf.activityId() + " não encontrado no snapshot da jornada"));
        return StepResponse.waiting(node.id(), node.name(), node.type());
    }

    private StepResponse resolveUserTask(UUID journeyId, TaskInfo task) {
        String formIdRaw = camundaClient.getTaskLocalVariable(task.id(), "formId")
                .orElseThrow(() -> new IllegalStateException("A User Task " + task.id() + " não tem variável local 'formId'"));
        PublicationSnapshot snapshot = adminBackClient.getPublicationSnapshot(journeyId);
        FormSnapshot form = snapshot.findForm(UUID.fromString(formIdRaw))
                .orElseThrow(() -> new IllegalStateException("Formulário " + formIdRaw + " não encontrado no snapshot da jornada"));
        return StepResponse.userTask(task.id(), task.taskDefinitionKey(), task.name(),
                new FormPayload(form.id(), form.name(), form.description(), form.sdui()));
    }
}
