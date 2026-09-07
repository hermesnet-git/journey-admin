package com.jouney.transformpublication.camunda;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
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
 * Thin client for the Camunda 7 REST API (engine-rest). Deploys BPMN and, on unpublish, deletes
 * one specific deployment (cascading to its runtime and history data) — but only once confirmed
 * no instance is currently active for it (see {@link ActiveInstancesExistException}) — this is a
 * simulated runtime integration, so it deliberately does not try to cover the full
 * deployment/versioning lifecycle Camunda supports.
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

    // Deleta só UM deployment específico (a versão que está sendo despublicada), não todos os já
    // feitos pra essa chave — usado quando o admin/back sabe exatamente qual deploymentId
    // corresponde à versão sendo despublicada (fluxo multi-versão: publicar uma versão nova não
    // derruba a anterior, então despublicar precisa mirar só a sua própria).
    public void deleteDeployment(String deploymentId) {
        long activeInstances = activeInstanceCountForDeployment(deploymentId);
        if (activeInstances > 0) {
            throw new ActiveInstancesExistException(
                    "Não é possível despublicar: existe(m) " + activeInstances
                            + " instância(s) de processo em execução para o deployment " + deploymentId
                            + ". Aguarde elas terminarem ou pare-as manualmente antes de despublicar.");
        }
        try {
            restClient.delete()
                    .uri(baseUrl + "/deployment/{id}?cascade=true", deploymentId)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientResponseException e) {
            throw new CamundaDeploymentException(
                    "Camunda rejeitou a remoção do deployment " + deploymentId + ": " + extractCamundaMessage(e), e);
        } catch (RestClientException e) {
            throw new CamundaUnavailableException("Não foi possível conectar ao Camunda em " + baseUrl, e);
        }
    }

    private long activeInstanceCountForDeployment(String deploymentId) {
        try {
            List<Map<String, Object>> definitions = restClient.get()
                    .uri(baseUrl + "/process-definition?deploymentId={id}", deploymentId)
                    .retrieve()
                    .body(new ParameterizedTypeReference<List<Map<String, Object>>>() {
                    });
            if (definitions == null || definitions.isEmpty()) {
                return 0L;
            }
            long total = 0L;
            for (Map<String, Object> definition : definitions) {
                Map<String, Object> count = restClient.get()
                        .uri(baseUrl + "/process-instance/count?processDefinitionId={id}",
                                String.valueOf(definition.get("id")))
                        .retrieve()
                        .body(new ParameterizedTypeReference<Map<String, Object>>() {
                        });
                Object value = count == null ? null : count.get("count");
                total += value instanceof Number n ? n.longValue() : 0L;
            }
            return total;
        } catch (RestClientResponseException e) {
            throw new CamundaDeploymentException(
                    "Camunda rejeitou a consulta de instâncias ativas do deployment " + deploymentId + ": "
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
