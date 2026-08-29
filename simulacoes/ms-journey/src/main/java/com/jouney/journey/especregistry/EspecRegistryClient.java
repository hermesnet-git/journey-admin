package com.jouney.journey.especregistry;

import com.jouney.journey.camunda.CamundaVariable;
import com.jouney.journey.config.EspecRegistryProperties;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Cliente só de specs do ms-espec-registry — nunca fala de instância/processo em execução. Usado
 * por JourneyController (catálogo/flow) e JourneyStepResolver (formulário do nó atual/conversão de
 * respostas), que cruzam essas specs com o estado do engine obtido via CamundaEngineClient.
 */
@Component
public class EspecRegistryClient {

    private final RestClient restClient = RestClient.create();
    private final EspecRegistryProperties properties;

    public EspecRegistryClient(EspecRegistryProperties properties) {
        this.properties = properties;
    }

    public List<JourneySummary> listJourneys() {
        return restClient.get()
                .uri(properties.baseUrl() + "/api/v1/journeys")
                .retrieve()
                .body(new ParameterizedTypeReference<List<JourneySummary>>() {
                });
    }

    public FlowBundle getFlow(UUID journeyId) {
        return restClient.get()
                .uri(properties.baseUrl() + "/api/v1/journeys/{id}/flow", journeyId)
                .retrieve()
                .body(FlowBundle.class);
    }

    public FormPayload resolveForm(UUID journeyId, String nodeId, Map<String, Object> variables) {
        return restClient.post()
                .uri(properties.baseUrl() + "/api/v1/journeys/{jid}/nodes/{nid}/form/resolve", journeyId, nodeId)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("variables", variables))
                .retrieve()
                .body(FormPayload.class);
    }

    public Map<String, CamundaVariable> convertAnswers(UUID journeyId, String nodeId, Map<String, Object> answers) {
        return restClient.post()
                .uri(properties.baseUrl() + "/api/v1/journeys/{jid}/nodes/{nid}/answers/convert", journeyId, nodeId)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("answers", answers))
                .retrieve()
                .body(new ParameterizedTypeReference<Map<String, CamundaVariable>>() {
                });
    }

    public Map<String, CamundaVariable> convertStartVariables(UUID journeyId, Map<String, Object> variables) {
        return restClient.post()
                .uri(properties.baseUrl() + "/api/v1/journeys/{jid}/start-variables/convert", journeyId)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("variables", variables != null ? variables : Map.of()))
                .retrieve()
                .body(new ParameterizedTypeReference<Map<String, CamundaVariable>>() {
                });
    }
}
