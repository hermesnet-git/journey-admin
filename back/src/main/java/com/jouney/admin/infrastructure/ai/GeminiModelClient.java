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

/**
 * Gemini API (generateContent). Cada chamada é uma conversa nova de um turno só (não um replay do
 * turno anterior do modelo): modelos Gemini com "thinking" ligado anexam um thought_signature à
 * function call, exigido de volta byte a byte pra continuar a mesma conversa — sem um formato
 * documentado pra REST puro, replicar isso manualmente é frágil. Quem chama é que põe o que foi
 * gerado antes e o que deu errado como texto no próximo prompt.
 */
@Component
public class GeminiModelClient implements AiModelClient {

    private final RestClient restClient = AiHttp.timeoutedRestClientBuilder()
            .baseUrl("https://generativelanguage.googleapis.com").build();

    @Override
    public AiProvider provider() {
        return AiProvider.GEMINI;
    }

    @Override
    public ToolCall call(String apiKey, String model, String systemPrompt, String userPrompt, List<ToolSpec> tools) {
        List<Map<String, Object>> declarations = tools.stream()
                .map(t -> Map.<String, Object>of("name", t.name(), "description", t.description(), "parameters", t.parameters()))
                .toList();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("contents", List.of(Map.of("role", "user", "parts", List.of(Map.of("text", userPrompt)))));
        body.put("systemInstruction", Map.of("parts", List.of(Map.of("text", systemPrompt))));
        body.put("tools", List.of(Map.of("functionDeclarations", declarations)));
        body.put("toolConfig", Map.of("functionCallingConfig", Map.of("mode", "ANY", "allowedFunctionNames",
                tools.stream().map(ToolSpec::name).toList())));

        JsonNode response;
        try {
            response = AiHttp.withRetry(() -> restClient.post()
                    .uri("/v1beta/models/{model}:generateContent", model)
                    .header("x-goog-api-key", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class));
        } catch (RestClientResponseException ex) {
            throw new AiGenerationException(AiHttp.failureMessage("do Gemini", ex), ex);
        } catch (ResourceAccessException ex) {
            throw new AiGenerationException("Não foi possível conectar à API do Gemini.", ex);
        }

        for (JsonNode part : response.path("candidates").path(0).path("content").path("parts")) {
            if (part.has("functionCall")) {
                JsonNode call = part.get("functionCall");
                return new ToolCall(call.path("name").asText(), call.get("args"));
            }
        }
        throw new AiGenerationException("A resposta da IA não incluiu uma chamada de função. Resposta bruta: " + response);
    }
}
