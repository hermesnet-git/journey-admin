package com.jouney.admin.infrastructure.ai;

import com.jouney.admin.domain.ai.AiProvider;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import tools.jackson.databind.JsonNode;

/** Claude pela Messages API da Anthropic, com uso de ferramenta obrigatório (tool_choice "any"). */
@Component
public class AnthropicModelClient implements AiModelClient {

    private static final int MAX_TOKENS = 16000;

    private final RestClient restClient = AiHttp.timeoutedRestClientBuilder()
            .baseUrl("https://api.anthropic.com").build();

    @Override
    public AiProvider provider() {
        return AiProvider.ANTHROPIC;
    }

    @Override
    public ToolCall call(String apiKey, String model, String systemPrompt, String userPrompt, List<ToolSpec> tools) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", model);
        body.put("max_tokens", MAX_TOKENS);
        body.put("system", systemPrompt);
        body.put("messages", List.of(Map.of("role", "user", "content", userPrompt)));
        body.put("tools", tools.stream()
                .map(t -> Map.<String, Object>of("name", t.name(), "description", t.description(), "input_schema", t.parameters()))
                .toList());
        body.put("tool_choice", Map.of("type", "any"));

        JsonNode response;
        try {
            response = AiHttp.withRetry(() -> restClient.post()
                    .uri("/v1/messages")
                    .header("x-api-key", apiKey)
                    .header("anthropic-version", "2023-06-01")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class));
        } catch (RestClientResponseException ex) {
            throw new AiGenerationException(AiHttp.failureMessage("da Anthropic", ex), ex);
        } catch (ResourceAccessException ex) {
            throw new AiGenerationException("Não foi possível conectar à API da Anthropic.", ex);
        }

        for (JsonNode block : response.path("content")) {
            if ("tool_use".equals(block.path("type").asText())) {
                return new ToolCall(block.path("name").asText(), block.get("input"));
            }
        }
        throw new AiGenerationException("A resposta da IA não incluiu uma chamada de ferramenta. Resposta bruta: " + response);
    }
}
