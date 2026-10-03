package com.jouney.journey;

import com.jouney.journey.camunda.CamundaEngineClient;
import com.jouney.journey.camunda.CamundaVariable;
import com.jouney.journey.camunda.ProcessIds;
import com.jouney.journey.camunda.ProcessInstanceInfo;
import com.jouney.journey.especregistry.EspecRegistryClient;
import com.jouney.journey.especregistry.FlowBundle;
import com.jouney.journey.especregistry.StepResponse;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
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
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import tools.jackson.databind.ObjectMapper;

/**
 * Fachada real da plataforma Dynamic Journey pros BFFs de canal: roda instâncias falando direto
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

    @GetMapping("/journeys/{journeyId}/flow")
    public FlowBundle flow(@PathVariable UUID journeyId) {
        return espec.getFlow(journeyId);
    }

    @PostMapping("/journeys/{journeyId}/instances")
    public InstanceResponse start(@PathVariable UUID journeyId, @RequestParam String channelType,
                                   @RequestBody(required = false) Map<String, Object> variables) {
        Map<String, CamundaVariable> startVariables = new LinkedHashMap<>(
                espec.convertStartVariables(journeyId, variables));
        // Vira variável de processo real, igual ao simulador interno do admin (SimulationController)
        // — {{channel}} funciona em condição de Gateway e na tela (visibilidade por canal) sem
        // nenhuma mudança na engine, o canal real só precisa declarar de onde está chamando.
        startVariables.put("channel", new CamundaVariable(channelType, "String"));
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
        int journeyVersion = stepResolver.journeyVersion(instance);
        Map<String, CamundaVariable> variables = espec.convertAnswers(journeyId, journeyVersion,
                current.nodeId(), answers);
        try {
            engineClient.completeTask(taskId, variables);
        } catch (RestClientException ex) {
            // A transação da engine dá rollback inteira quando um conector síncrono falha no meio da
            // continuação — nada avança. Diferente do simulador interno do admin, não tenta apontar
            // qual nó falhou (diagnóstico de debug, fora de escopo aqui): só devolve o mesmo passo
            // atual com uma mensagem de erro, pro canal poder avisar o usuário e deixar tentar de novo.
            return current.withError(engineMessage(ex));
        }
        return stepResolver.resolve(processInstanceId);
    }

    // Ids (separados por vírgula) das telas do histórico que já foram destino de um "voltar".
    private static final String CONSUMED_VARIABLE = "_voltasConsumidas";

    /** Botão "Voltar" (action.navigate com destino "voltar"): reabre a tela anterior sem concluir a
     * atual. Quando não dá para voltar, devolve o mesmo passo com a mensagem (como completeTask). */
    @PostMapping("/instances/{processInstanceId}/back")
    public StepResponse back(@PathVariable String processInstanceId) {
        StepResponse current = stepResolver.resolve(processInstanceId);
        if (!"USER_TASK".equals(current.type())) {
            throw new IllegalStateException("A instância " + processInstanceId + " não está numa tela");
        }
        ProcessInstanceInfo instance = engineClient.getProcessInstance(processInstanceId)
                .orElseThrow(() -> new IllegalStateException("Instância de processo não encontrada: " + processInstanceId));
        UUID journeyId = ProcessIds.journeyIdFromKey(instance.definitionKey());

        CamundaVariable consumedVariable = engineClient.getProcessVariables(processInstanceId).get(CONSUMED_VARIABLE);
        String consumedText = consumedVariable != null && consumedVariable.value() != null ? String.valueOf(consumedVariable.value()) : "";
        Set<String> consumed = consumedText.isBlank() ? new LinkedHashSet<>() : new LinkedHashSet<>(List.of(consumedText.split(",")));
        List<BackNavigation.Activity> history = engineClient.getActivityHistory(processInstanceId).stream()
                .map(a -> new BackNavigation.Activity(String.valueOf(a.get("id")), String.valueOf(a.get("activityId")),
                        String.valueOf(a.get("activityType")), (String) a.get("startTime"), (String) a.get("endTime"),
                        Boolean.TRUE.equals(a.get("canceled"))))
                .toList();
        BackNavigation.Decision decision = BackNavigation.decide(history, current.nodeId(), consumed, espec.writeNodeIds(journeyId));
        if (decision.target() == null) {
            return current.withError(decision.refusal());
        }
        String openInstance = engineClient.findActiveActivityInstanceId(processInstanceId, current.nodeId())
                .orElseThrow(() -> new IllegalStateException("Tela atual não encontrada no motor: " + current.nodeId()));
        engineClient.reopenActivity(processInstanceId, decision.target().activityId(), openInstance,
                "Voltar à tela anterior: " + current.nodeId() + " → " + decision.target().activityId());
        consumed.add(decision.target().id());
        engineClient.setStringVariable(processInstanceId, CONSUMED_VARIABLE, String.join(",", consumed));
        return stepResolver.resolve(processInstanceId);
    }

    private static final ObjectMapper JSON = new ObjectMapper();

    // O motor responde {"type":...,"message":"..."} — o canal só precisa do texto (ex.: "O serviço
    // localhost não aceitou a conexão (3 tentativas)."), não do JSON de erro inteiro.
    private static String engineMessage(RestClientException ex) {
        if (ex instanceof HttpStatusCodeException httpEx && !httpEx.getResponseBodyAsString().isBlank()) {
            try {
                String message = JSON.readTree(httpEx.getResponseBodyAsString()).path("message").asString(null);
                if (message != null && !message.isBlank()) {
                    return message;
                }
            } catch (RuntimeException notJson) {
                // segue com a mensagem original
            }
        }
        return ex.getMessage();
    }

    @DeleteMapping("/instances/{processInstanceId}")
    public void stop(@PathVariable String processInstanceId) {
        engineClient.deleteProcessInstance(processInstanceId);
    }
}
