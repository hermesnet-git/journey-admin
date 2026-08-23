package com.jouney.transformpublication.camunda;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

/**
 * Thin client for the Camunda 7 REST API (engine-rest). Deploys BPMN and, on unpublish,
 * deletes every deployment for the journey's process definition key (cascading to runtime
 * and history data) — this is a simulated runtime integration, so it deliberately does not
 * try to cover the full deployment/versioning lifecycle Camunda supports.
 */
@Component
public class CamundaRestClient {

    public record DeploymentResult(String deploymentId, String processDefinitionId) {
    }

    // Only used to pull the "message" field out of Camunda's own error body — internal detail, no
    // need for the app's shared Jackson config, so a plain instance (same call BpmnTransformer makes).
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final RestClient restClient;
    private final String baseUrl;

    public CamundaRestClient(CamundaProperties properties) {
        this.baseUrl = properties.baseUrl();
        this.restClient = RestClient.create();
    }

    public DeploymentResult deploy(String processId, byte[] bpmnXml) {
        String resourceName = processId + ".bpmn";
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("deployment-name", "journey-" + processId);
        body.add("deployment-source", "ms-transform-publication");
        body.add(resourceName, new ByteArrayResource(bpmnXml) {
            @Override
            public String getFilename() {
                return resourceName;
            }
        });

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restClient.post()
                    .uri(baseUrl + "/deployment/create")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(body)
                    .retrieve()
                    .body(Map.class);
            return toDeploymentResult(response);
        } catch (RestClientResponseException e) {
            // Camunda answered — it's up, it just rejected this specific BPMN (e.g. an invalid JUEL
            // expression in a gateway condition). Not an availability problem.
            throw new CamundaDeploymentException(
                    "Camunda rejeitou o deploy do processo " + processId + ": " + extractCamundaMessage(e), e);
        } catch (RestClientException e) {
            // No response at all — connection refused, timeout, DNS failure. This IS an availability
            // problem, unlike the case above.
            throw new CamundaUnavailableException("Não foi possível conectar ao Camunda em " + baseUrl, e);
        }
    }

    // Camunda's own deployment error body is short, genuinely useful JSON (e.g.
    // {"type":"ProcessEngineException","message":"ENGINE-01009 ... lexical error ..."}) that used to
    // get thrown away entirely — the caller only ever saw "Failed to deploy process X to Camunda",
    // with no way to tell a BPMN/JUEL problem in the journey itself from Camunda being down, and no
    // detail on which expression broke. Pulls just the "message" field so what reaches the Admin
    // Portal is one clean sentence instead of that JSON re-wrapped (and re-escaped) through every hop
    // between here and the user.
    private String extractCamundaMessage(RestClientResponseException e) {
        String body = e.getResponseBodyAsString();
        if (body != null && !body.isBlank()) {
            try {
                JsonNode node = objectMapper.readTree(body);
                JsonNode message = node.get("message");
                if (message != null && message.isTextual() && !message.asText().isBlank()) {
                    return message.asText();
                }
            } catch (Exception ignored) {
                // Body isn't the JSON shape we expect (e.g. an HTML error page) — fall through.
            }
        }
        return e.getStatusCode().value() + " " + e.getStatusText();
    }

    // Deletes every deployment ever made for this key (all republish versions), not just the
    // latest — unpublishing a journey should leave no trace of it in Camunda.
    public void deleteAllDeploymentsForKey(String processDefinitionKey) {
        try {
            List<Map<String, Object>> definitions = restClient.get()
                    .uri(baseUrl + "/process-definition?key={key}", processDefinitionKey)
                    .retrieve()
                    .body(new ParameterizedTypeReference<List<Map<String, Object>>>() {
                    });
            Set<String> deploymentIds = definitions == null ? Set.of()
                    : definitions.stream()
                            .map(d -> String.valueOf(d.get("deploymentId")))
                            .collect(Collectors.toSet());
            for (String deploymentId : deploymentIds) {
                restClient.delete()
                        .uri(baseUrl + "/deployment/{id}?cascade=true", deploymentId)
                        .retrieve()
                        .toBodilessEntity();
            }
        } catch (RestClientResponseException e) {
            throw new CamundaDeploymentException(
                    "Camunda rejeitou a remoção dos deployments de " + processDefinitionKey + ": "
                            + extractCamundaMessage(e), e);
        } catch (RestClientException e) {
            throw new CamundaUnavailableException("Não foi possível conectar ao Camunda em " + baseUrl, e);
        }
    }

    @SuppressWarnings("unchecked")
    private DeploymentResult toDeploymentResult(Map<String, Object> response) {
        if (response == null) {
            return new DeploymentResult(null, null);
        }
        String deploymentId = String.valueOf(response.get("id"));
        Object defs = response.get("deployedProcessDefinitions");
        String processDefinitionId = null;
        if (defs instanceof Map<?, ?> defsMap && !defsMap.isEmpty()) {
            Object first = defsMap.values().iterator().next();
            if (first instanceof Map<?, ?> def) {
                Object id = ((Map<String, Object>) def).get("id");
                processDefinitionId = id != null ? id.toString() : null;
            }
        }
        return new DeploymentResult(deploymentId, processDefinitionId);
    }
}
