package com.jouney.transformpublication.camunda;

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
        } catch (RestClientException e) {
            throw new CamundaDeploymentException("Failed to deploy process " + processId + " to Camunda", e);
        }
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
        } catch (RestClientException e) {
            throw new CamundaDeploymentException(
                    "Failed to delete deployments for process definition " + processDefinitionKey + " in Camunda", e);
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
