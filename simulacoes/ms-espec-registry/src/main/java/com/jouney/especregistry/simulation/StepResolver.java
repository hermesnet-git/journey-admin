package com.jouney.especregistry.simulation;

import com.jouney.especregistry.adminback.AdminBackClient;
import com.jouney.especregistry.adminback.FlowNode;
import com.jouney.especregistry.adminback.FormSnapshot;
import com.jouney.especregistry.adminback.PublicationSnapshot;
import com.jouney.especregistry.camunda.ActivityInstanceNode;
import com.jouney.especregistry.camunda.CamundaClient;
import com.jouney.especregistry.camunda.CamundaVariable;
import com.jouney.especregistry.camunda.ProcessIds;
import com.jouney.especregistry.camunda.ProcessInstanceInfo;
import com.jouney.especregistry.camunda.TaskInfo;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

/**
 * Função central reaproveitada por start/complete/simulate: dado um processInstanceId, descobre o
 * que o simulador deve mostrar agora — uma User Task com seu formulário SDUI, um passo
 * SERVICE_TASK/RECEIVE_TASK aguardando "Simular conclusão", ou o fim do processo.
 */
@Component
public class StepResolver {

    // Same {{name}} syntax as connector fields/gateway conditions (REQ-03.09.012), resolved here
    // against the running instance's variables instead of by the engine (JUEL/Spin) — this is
    // display-only content served straight to the channel, never part of the BPMN.
    private static final Pattern VARIABLE_TOKEN = Pattern.compile("\\{\\{\\s*([A-Za-z_][A-Za-z0-9_]*)\\s*\\}\\}");

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
        Optional<String> formIdRaw = camundaClient.getTaskLocalVariable(task.id(), "formId");
        if (formIdRaw.isEmpty()) {
            // REQ-04.01.005: a USER_TASK may have no form — a display-only step (a message, maybe
            // built from a prior integration's output). Synthesize the smallest SDUI the channel
            // already knows how to render: a text node plus the "Avançar" button the form renderer
            // always shows, same shape FormSduiSerializer produces for a real TEXT field.
            FlowNode node = snapshot.findNode(task.taskDefinitionKey())
                    .orElseThrow(() -> new IllegalStateException("Nó " + task.taskDefinitionKey() + " não encontrado no snapshot da jornada"));
            String message = resolveMessage(node, processInstanceId);
            return StepResponse.userTask(task.id(), task.taskDefinitionKey(), task.name(),
                    new FormPayload(null, node.name(), null, messageSdui(message)));
        }
        FormSnapshot form = snapshot.findForm(UUID.fromString(formIdRaw.get()))
                .orElseThrow(() -> new IllegalStateException("Formulário " + formIdRaw.get() + " não encontrado no snapshot da jornada"));
        return StepResponse.userTask(task.id(), task.taskDefinitionKey(), task.name(),
                new FormPayload(form.id(), form.name(), form.description(), form.sdui()));
    }

    // Resolves {{name}} tokens in the node's messageText against this instance's current process
    // variables; falls back to the node's own name when there's no message configured at all, so a
    // formless User Task never renders blank.
    private String resolveMessage(FlowNode node, String processInstanceId) {
        String text = node.messageText();
        if (text == null || text.isBlank()) {
            return node.name();
        }
        Map<String, CamundaVariable> variables = camundaClient.getProcessVariables(processInstanceId);
        Matcher matcher = VARIABLE_TOKEN.matcher(text);
        StringBuilder result = new StringBuilder();
        while (matcher.find()) {
            CamundaVariable variable = variables.get(matcher.group(1));
            String value = variable != null && variable.value() != null ? String.valueOf(variable.value()) : "";
            matcher.appendReplacement(result, Matcher.quoteReplacement(value));
        }
        matcher.appendTail(result);
        return result.toString();
    }

    private List<Object> messageSdui(String message) {
        List<Object> textNode = new ArrayList<>(3);
        textNode.add("ui.text");
        textNode.add(Map.of("text", message));
        textNode.add(List.of());

        List<Object> form = new ArrayList<>(3);
        form.add("ui.form");
        form.add(Map.of());
        form.add(List.of(textNode));
        return form;
    }
}
