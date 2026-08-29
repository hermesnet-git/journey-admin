package com.jouney.journey;

import com.jouney.journey.camunda.CamundaEngineClient;
import com.jouney.journey.camunda.CamundaVariable;
import com.jouney.journey.camunda.ProcessIds;
import com.jouney.journey.camunda.ProcessInstanceInfo;
import com.jouney.journey.especregistry.EspecRegistryClient;
import com.jouney.journey.especregistry.FlowBundle;
import com.jouney.journey.especregistry.JourneySummary;
import com.jouney.journey.especregistry.StepResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClientException;

/**
 * Fachada real da plataforma Elastic Journey pros BFFs de canal: roda instâncias falando direto
 * com o engine (CamundaEngineClient), cruzando com o formulário do nó atual (EspecRegistryClient +
 * JourneyStepResolver). Nunca expõe os endpoints de debug do simulador interno do admin
 * (simulate-step, kafka manual, variáveis, histórico) — só o essencial que um canal real chamaria.
 */
@RestController
@RequestMapping("/api/v1")
public class JourneyController {

    private final EspecRegistryClient espec;
    private final CamundaEngineClient engineClient;
    private final JourneyStepResolver stepResolver;

    public JourneyController(EspecRegistryClient espec, CamundaEngineClient engineClient, JourneyStepResolver stepResolver) {
        this.espec = espec;
        this.engineClient = engineClient;
        this.stepResolver = stepResolver;
    }

    @GetMapping("/journeys")
    public List<JourneySummary> journeys(@RequestParam String channelType) {
        // ponytail: N+1 (1 GET /journeys + 1 GET /flow por jornada) pra descobrir o channelType
        // técnico de cada uma, que só existe em FlowBundle — aceitável pro catálogo pequeno de uma
        // simulação. Upgrade se crescer: cache de channelType por journeyId.
        List<JourneySummary> result = new ArrayList<>();
        for (JourneySummary journey : espec.listJourneys()) {
            FlowBundle flow = espec.getFlow(journey.journeyId());
            if (channelType.equalsIgnoreCase(flow.channelType())) {
                result.add(journey.withChannelType(flow.channelType()));
            }
        }
        return result;
    }

    @GetMapping("/journeys/{journeyId}/flow")
    public FlowBundle flow(@PathVariable UUID journeyId) {
        return espec.getFlow(journeyId);
    }

    @PostMapping("/journeys/{journeyId}/instances")
    public InstanceResponse start(@PathVariable UUID journeyId, @RequestBody(required = false) Map<String, Object> variables) {
        Map<String, CamundaVariable> startVariables = espec.convertStartVariables(journeyId, variables);
        String businessKey = UUID.randomUUID().toString();
        String processInstanceId = engineClient.startProcessInstance(ProcessIds.keyForJourney(journeyId), startVariables, businessKey);
        StepResponse step = stepResolver.resolve(processInstanceId);
        return new InstanceResponse(processInstanceId, businessKey, espec.getFlow(journeyId), step);
    }

    @GetMapping("/instances/{processInstanceId}/current-step")
    public StepResponse currentStep(@PathVariable String processInstanceId) {
        return stepResolver.resolve(processInstanceId);
    }

    @PostMapping("/instances/{processInstanceId}/tasks/{taskId}/complete")
    public StepResponse completeTask(@PathVariable String processInstanceId, @PathVariable String taskId,
                                      @RequestBody(required = false) Map<String, Object> body) {
        StepResponse current = stepResolver.resolve(processInstanceId);
        if (!"USER_TASK".equals(current.type()) || !taskId.equals(current.taskId())) {
            throw new IllegalStateException("Task " + taskId + " não é o passo ativo atual da instância " + processInstanceId);
        }
        ProcessInstanceInfo instance = engineClient.getProcessInstance(processInstanceId)
                .orElseThrow(() -> new IllegalStateException("Instância de processo não encontrada: " + processInstanceId));
        UUID journeyId = ProcessIds.journeyIdFromKey(instance.definitionKey());

        Object answersRaw = body != null ? body.get("answers") : null;
        @SuppressWarnings("unchecked")
        Map<String, Object> answers = answersRaw instanceof Map<?, ?> m ? (Map<String, Object>) m : Map.of();
        Map<String, CamundaVariable> variables = espec.convertAnswers(journeyId, current.nodeId(), answers);
        try {
            engineClient.completeTask(taskId, variables);
        } catch (RestClientException ex) {
            // A transação da engine dá rollback inteira quando um conector síncrono falha no meio da
            // continuação — nada avança. Diferente do simulador interno do admin, não tenta apontar
            // qual nó falhou (diagnóstico de debug, fora de escopo aqui): só devolve o mesmo passo
            // atual com uma mensagem de erro, pro canal poder avisar o usuário e deixar tentar de novo.
            return current.withError(ex.getMessage());
        }
        return stepResolver.resolve(processInstanceId);
    }

    @DeleteMapping("/instances/{processInstanceId}")
    public void stop(@PathVariable String processInstanceId) {
        engineClient.deleteProcessInstance(processInstanceId);
    }
}
