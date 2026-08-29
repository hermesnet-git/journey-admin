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
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * Função central reaproveitada por start/complete/simulate: dado um processInstanceId, descobre o
 * que o simulador deve mostrar agora — uma User Task com seu formulário SDUI, um passo
 * SERVICE_TASK/RECEIVE_TASK aguardando "Simular conclusão", ou o fim do processo. A resolução de
 * {{variável}} dentro da árvore SDUI em si vive em SduiTemplateResolver (extraído pra ser
 * reaproveitado também pelo FormSpecController, que não tem processInstanceId).
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
            return resolveUserTask(journeyId, tasks.get(0), processInstanceId);
        }

        ActivityInstanceNode leaf = camundaClient.findLeafActivity(processInstanceId)
                .orElseThrow(() -> new IllegalStateException("Nenhum passo ativo encontrado para a instância " + processInstanceId));
        PublicationSnapshot snapshot = adminBackClient.getPublicationSnapshot(journeyId);
        FlowNode node = snapshot.findNode(leaf.activityId())
                .orElseThrow(() -> new IllegalStateException("Nó " + leaf.activityId() + " não encontrado no snapshot da jornada"));
        return StepResponse.waiting(node.id(), node.name(), node.type());
    }

    private StepResponse resolveUserTask(UUID journeyId, TaskInfo task, String processInstanceId) {
        PublicationSnapshot snapshot = adminBackClient.getPublicationSnapshot(journeyId);
        FlowNode node = snapshot.findNode(task.taskDefinitionKey())
                .orElseThrow(() -> new IllegalStateException("Nó " + task.taskDefinitionKey() + " não encontrado no snapshot da jornada"));
        if (node.embeddedScreenSdui() == null || node.embeddedScreenSdui().isEmpty()) {
            // REQ-04.01.005: a USER_TASK may have no tela desenhada — a display-only step (a
            // message, maybe built from a prior integration's output). Synthesize the smallest SDUI
            // the channel already knows how to render: a text node plus the "Avançar" button the
            // form renderer always shows, same shape FormSduiSerializer produces for a real TEXT field.
            String message = resolveMessage(node, processInstanceId);
            return StepResponse.userTask(task.id(), task.taskDefinitionKey(), task.name(),
                    new FormPayload(null, node.name(), null, SduiTemplateResolver.messageSdui(message)));
        }
        Map<String, CamundaVariable> variables = camundaClient.getProcessVariables(processInstanceId);
        List<Object> resolvedSdui = SduiTemplateResolver.resolveSduiNode(node.embeddedScreenSdui(), variables);
        return StepResponse.userTask(task.id(), task.taskDefinitionKey(), task.name(),
                new FormPayload(null, node.name(), null, resolvedSdui));
    }

    // Falls back to the node's own name when there's no message configured at all, so a formless
    // User Task never renders blank. Mantido aqui (em vez de mover pra SduiTemplateResolver junto
    // com o resto) porque só esta versão precisa do fetch preguiçoso de variáveis — só busca no
    // Camunda quando há de fato um messageText a resolver.
    private String resolveMessage(FlowNode node, String processInstanceId) {
        String text = node.messageText();
        if (text == null || text.isBlank()) {
            return node.name();
        }
        return SduiTemplateResolver.resolveTemplate(text, camundaClient.getProcessVariables(processInstanceId));
    }
}
