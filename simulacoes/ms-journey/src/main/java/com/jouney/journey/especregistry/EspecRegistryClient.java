package com.jouney.journey.especregistry;

import com.jouney.journey.camunda.CamundaVariable;
import com.jouney.journey.config.EspecRegistryProperties;
import java.util.Map;
import java.util.UUID;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Cliente só de specs do ms-espec-registry — nunca fala de instância/processo em execução. Usado
 * por JourneyController (flow) e JourneyStepResolver (formulário do nó atual/conversão de
 * respostas), que cruzam essas specs com o estado do engine obtido via CamundaEngineClient.
 */
@Component
public class EspecRegistryClient {

    private final RestClient restClient = RestClient.create();
    private final EspecRegistryProperties properties;

    public EspecRegistryClient(EspecRegistryProperties properties) {
        this.properties = properties;
    }

    public FlowBundle getFlow(UUID journeyId) {
        return restClient.get()
                .uri(properties.baseUrl() + "/api/v1/journeys/{id}/flow", journeyId)
                .retrieve()
                .body(FlowBundle.class);
    }

    /**
     * Ids dos nós de integração que gravam no sistema de origem (tudo que não é REST GET) — o
     * "voltar à tela anterior" não passa por cima deles. Lê o fluxo cru só aqui: o {@link FlowNode}
     * repassado aos canais continua sem a configuração das integrações.
     */
    @SuppressWarnings("unchecked")
    public java.util.Set<String> writeNodeIds(UUID journeyId) {
        Map<String, Object> flow = restClient.get()
                .uri(properties.baseUrl() + "/api/v1/journeys/{id}/flow", journeyId)
                .retrieve()
                .body(new ParameterizedTypeReference<Map<String, Object>>() {
                });
        java.util.Set<String> ids = new java.util.HashSet<>();
        Object nodes = flow != null ? flow.get("flowNodes") : null;
        for (Object raw : nodes instanceof java.util.List<?> list ? list : java.util.List.of()) {
            if (!(raw instanceof Map<?, ?> node) || !"SERVICE_TASK".equals(node.get("type"))) {
                continue;
            }
            Map<String, Object> connector = node.get("connectorConfig") instanceof Map<?, ?> c ? (Map<String, Object>) c : Map.of();
            Map<String, Object> config = connector.get("config") instanceof Map<?, ?> c ? (Map<String, Object>) c : Map.of();
            boolean restRead = "REST".equals(connector.get("connectorType")) && "GET".equalsIgnoreCase(String.valueOf(config.get("method")));
            if (!restRead) {
                ids.add(String.valueOf(node.get("id")));
            }
        }
        return ids;
    }

    public FormPayload resolveForm(UUID journeyId, int journeyVersion, String nodeId, Map<String, Object> variables,
                                   String processInstanceId) {
        return restClient.post()
                .uri(properties.baseUrl() + "/api/v1/journeys/{jid}/versions/{version}/nodes/{nid}/form/resolve",
                        journeyId, journeyVersion, nodeId)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("variables", variables, "processInstanceId", processInstanceId))
                .retrieve()
                .body(FormPayload.class);
    }

    public Map<String, CamundaVariable> convertAnswers(UUID journeyId, int journeyVersion, String nodeId,
                                                        Map<String, Object> answers) {
        return restClient.post()
                .uri(properties.baseUrl() + "/api/v1/journeys/{jid}/versions/{version}/nodes/{nid}/answers/convert",
                        journeyId, journeyVersion, nodeId)
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
