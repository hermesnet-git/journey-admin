package com.jouney.journey;

import com.jouney.journey.camunda.ActivityInstanceNode;
import com.jouney.journey.camunda.CamundaEngineClient;
import com.jouney.journey.camunda.CamundaVariable;
import com.jouney.journey.camunda.ProcessIds;
import com.jouney.journey.camunda.ProcessInstanceInfo;
import com.jouney.journey.camunda.TaskInfo;
import com.jouney.journey.especregistry.EspecRegistryClient;
import com.jouney.journey.especregistry.FlowBundle;
import com.jouney.journey.especregistry.FlowNode;
import com.jouney.journey.especregistry.FormPayload;
import com.jouney.journey.especregistry.StepResponse;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * A "cola" entre o engine (CamundaEngineClient) e o registro de specs (EspecRegistryClient): dado
 * um processInstanceId, descobre o que o canal deve mostrar agora — cruzando "o que o Camunda diz"
 * (task/activity ativa) com "o que o spec diz" (formulário daquele nó) — sem ser dono de nenhum dos
 * dois. Mesmo algoritmo de StepResolver (ms-espec-registry): getProcessInstance → tasks ativas →
 * senão leaf activity.
 */
@Component
public class JourneyStepResolver {

    private final CamundaEngineClient engineClient;
    private final EspecRegistryClient espec;

    public JourneyStepResolver(CamundaEngineClient engineClient, EspecRegistryClient espec) {
        this.engineClient = engineClient;
        this.espec = espec;
    }

    public StepResponse resolve(String processInstanceId) {
        Optional<ProcessInstanceInfo> instance = engineClient.getProcessInstance(processInstanceId);
        if (instance.isEmpty()) {
            return StepResponse.ended();
        }
        UUID journeyId = ProcessIds.journeyIdFromKey(instance.get().definitionKey());

        List<TaskInfo> tasks = engineClient.findActiveUserTasks(processInstanceId);
        if (!tasks.isEmpty()) {
            TaskInfo task = tasks.get(0);
            Map<String, Object> variables = rawValues(engineClient.getProcessVariables(processInstanceId));
            FormPayload form = espec.resolveForm(journeyId, task.taskDefinitionKey(), variables);
            return StepResponse.userTask(task.id(), task.taskDefinitionKey(), task.name(), form);
        }

        ActivityInstanceNode leaf = engineClient.findLeafActivity(processInstanceId)
                .orElseThrow(() -> new IllegalStateException("Nenhum passo ativo encontrado para a instância " + processInstanceId));
        FlowBundle flow = espec.getFlow(journeyId);
        FlowNode node = flow.flowNodes().stream()
                .filter(n -> n.id().equals(leaf.activityId()))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Nó " + leaf.activityId() + " não encontrado no flow da jornada"));
        return StepResponse.waiting(node.id(), node.name(), node.type());
    }

    private Map<String, Object> rawValues(Map<String, CamundaVariable> variables) {
        Map<String, Object> raw = new LinkedHashMap<>();
        variables.forEach((name, variable) -> raw.put(name, variable.value()));
        return raw;
    }
}
