package com.jouney.admin.infrastructure.ai;

import com.jouney.admin.domain.ai.AiProvider;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Chat completions no formato da OpenAI, com chamada de função obrigatória (tool_choice
 * "required"). Serve à OpenAI e ao GitHub Models, que falam o mesmo formato: só mudam a URL base, o
 * caminho e os cabeçalhos extras.
 */
public class OpenAiCompatibleModelClient implements AiModelClient {

    private final AiProvider provider;
    private final String label;
    private final String path;
    private final Map<String, String> extraHeaders;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public OpenAiCompatibleModelClient(AiProvider provider, String label, String baseUrl, String path,
                                        Map<String, String> extraHeaders, ObjectMapper objectMapper) {
        this.provider = provider;
        this.label = label;
        this.path = path;
        this.extraHeaders = extraHeaders;
        this.objectMapper = objectMapper;
        this.restClient = AiHttp.timeoutedRestClientBuilder().baseUrl(baseUrl).build();
    }

    @Override
    public AiProvider provider() {
        return provider;
    }

    @Override
    public ToolCall call(String apiKey, String model, String systemPrompt, String userPrompt, List<ToolSpec> tools) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", model);
        body.put("messages", List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", userPrompt)));
        body.put("tools", tools.stream()
                .map(t -> Map.<String, Object>of("type", "function", "function",
                        Map.of("name", t.name(), "description", t.description(), "parameters", t.parameters())))
                .toList());
        body.put("tool_choice", "required");

        JsonNode response;
        try {
            response = AiHttp.withRetry(() -> restClient.post()
                    .uri(path)
                    .headers(headers -> extraHeaders.forEach(headers::set))
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class));
        } catch (RestClientResponseException ex) {
            throw new AiGenerationException(AiHttp.failureMessage(label, ex), ex);
        } catch (ResourceAccessException ex) {
            throw new AiGenerationException("Não foi possível conectar à API " + label + ".", ex);
        }

        JsonNode call = response.path("choices").path(0).path("message").path("tool_calls").path(0).path("function");
        if (call.isMissingNode() || call.isNull()) {
            throw new AiGenerationException("A resposta da IA não incluiu uma chamada de função. Resposta bruta: " + response);
        }
        try {
            return new ToolCall(call.path("name").asText(), objectMapper.readTree(call.path("arguments").asText()));
        } catch (Exception ex) {
            throw new AiGenerationException("Os argumentos da chamada de função não são um JSON válido: " + ex.getMessage(), ex);
        }
    }
}
