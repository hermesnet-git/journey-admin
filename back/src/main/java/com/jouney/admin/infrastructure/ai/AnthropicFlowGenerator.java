package com.jouney.admin.infrastructure.ai;

import com.jouney.admin.domain.flow.AiFlowGenerator;
import com.jouney.admin.domain.flow.FlowValidationException;
import com.jouney.admin.domain.flow.FlowValidator;
import com.jouney.admin.domain.flow.GeneratedFlow;
import com.jouney.admin.domain.flow.GenerationContext;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Consumer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Adapter da Anthropic Messages API pra AiFlowGenerator (protótipo, FT-03 "gerar fluxo por prompt").
 * É dono do loop de correção inteiro: força a ferramenta {@code generate_flow}, valida o candidato
 * contra o FlowValidator (a mesma regra de domínio que o salvamento manual aplica) e, havendo
 * violação, reenvia a conversa com as violações como um tool_result pro modelo corrigir a própria
 * saída, até {@link #MAX_ATTEMPTS} tentativas. Sem modo estrito de JSON schema: connectorConfig.config
 * é genuinamente livre (formato REST vs. Kafka), então o FlowValidator + este loop são o verdadeiro
 * portão de correção, não o schema.
 */
@Component
@ConditionalOnProperty(prefix = "ai", name = "provider", havingValue = "anthropic")
public class AnthropicFlowGenerator implements AiFlowGenerator {

    private static final int MAX_ATTEMPTS = 3;
    private static final Map<String, Object> TOOL_DEFINITION = buildToolDefinition();
    private static final Map<String, Object> DECLINE_TOOL_DEFINITION = buildDeclineToolDefinition();

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String model;

    public AnthropicFlowGenerator(ObjectMapper objectMapper, @Value("${anthropic.api-key:}") String apiKey,
                                   @Value("${anthropic.model:claude-opus-5}") String model) {
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
        this.model = model;
        this.restClient = FlowGenerationPrompt.timeoutedRestClientBuilder().baseUrl("https://api.anthropic.com").build();
    }

    @Override
    public GeneratedFlow generate(GenerationContext context, Consumer<String> onProgress) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new AiGenerationException("ANTHROPIC_API_KEY não configurada no servidor.");
        }

        List<Map<String, Object>> messages = new ArrayList<>();
        messages.add(Map.of("role", "user", "content", FlowGenerationPrompt.buildUserPrompt(context)));
        Map<UUID, List<String>> formFieldNamesByFormId = new HashMap<>();
        for (var form : context.forms()) {
            formFieldNamesByFormId.put(form.id(), form.fieldNames());
        }

        FlowValidationException lastViolation = null;
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            onProgress.accept("Tentativa " + attempt + "/" + MAX_ATTEMPTS + ": chamando Claude (" + model + ")...");
            long start = System.currentTimeMillis();
            JsonNode toolUse = callClaude(messages);
            onProgress.accept("Tentativa " + attempt + ": resposta recebida em "
                    + String.format("%.1fs", (System.currentTimeMillis() - start) / 1000.0) + ".");
            if (FlowGenerationPrompt.DECLINE_TOOL_NAME.equals(toolUse.path("name").asText())) {
                throw new AiRequestDeclinedException(toolUse.path("input").path("reason").asText());
            }
            FlowGenerationPrompt.LlmFlowOutput output;
            try {
                output = objectMapper.treeToValue(toolUse.get("input"), FlowGenerationPrompt.LlmFlowOutput.class);
            } catch (Exception ex) {
                throw new AiGenerationException("Resposta da IA em formato inesperado: " + ex.getMessage(), ex);
            }
            GeneratedFlow candidate = FlowGenerationPrompt.toDomain(output);
            onProgress.accept("Tentativa " + attempt + ": " + FlowGenerationPrompt.describeFlow(candidate) + " — validando...");
            try {
                FlowValidator.validate(candidate.nodes(), candidate.connections(), formFieldNamesByFormId);
                onProgress.accept("Tentativa " + attempt + ": fluxo válido.");
                return candidate;
            } catch (FlowValidationException ex) {
                lastViolation = ex;
                if (attempt == MAX_ATTEMPTS) {
                    throw ex;
                }
                FlowGenerationPrompt.reportViolations(onProgress, attempt, ex.getViolations());
                onProgress.accept("Pedindo correção pro modelo...");
                messages.add(Map.of("role", "assistant", "content",
                        List.of(objectMapper.convertValue(toolUse, Map.class))));
                messages.add(Map.of("role", "user", "content", List.of(Map.of(
                        "type", "tool_result",
                        "tool_use_id", toolUse.get("id").asText(),
                        "content", "O fluxo gerado tem estes problemas — corrija e chame generate_flow de novo: "
                                + String.join("; ", ex.getViolations())))));
            }
        }
        throw lastViolation;
    }

    private JsonNode callClaude(List<Map<String, Object>> messages) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", model);
        body.put("max_tokens", 8000);
        body.put("system", FlowGenerationPrompt.SYSTEM_PROMPT);
        body.put("tools", List.of(TOOL_DEFINITION, DECLINE_TOOL_DEFINITION));
        body.put("tool_choice", Map.of("type", "any"));
        body.put("messages", messages);

        JsonNode response;
        try {
            response = restClient.post()
                    .uri("/v1/messages")
                    .header("x-api-key", apiKey)
                    .header("anthropic-version", "2023-06-01")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);
        } catch (RestClientResponseException ex) {
            throw new AiGenerationException(
                    "Falha ao chamar a API da Anthropic (" + ex.getStatusCode() + "): " + ex.getResponseBodyAsString(), ex);
        } catch (ResourceAccessException ex) {
            throw new AiGenerationException("Não foi possível conectar à API da Anthropic.", ex);
        }

        for (JsonNode block : response.path("content")) {
            if ("tool_use".equals(block.path("type").asText())) {
                return block;
            }
        }
        throw new AiGenerationException("A resposta da IA não incluiu uma chamada de ferramenta.");
    }

    private static Map<String, Object> buildToolDefinition() {
        Map<String, Object> tool = new LinkedHashMap<>();
        tool.put("name", FlowGenerationPrompt.TOOL_NAME);
        tool.put("description", FlowGenerationPrompt.TOOL_DESCRIPTION);
        tool.put("input_schema", FlowGenerationPrompt.schema());
        return tool;
    }

    private static Map<String, Object> buildDeclineToolDefinition() {
        Map<String, Object> tool = new LinkedHashMap<>();
        tool.put("name", FlowGenerationPrompt.DECLINE_TOOL_NAME);
        tool.put("description", FlowGenerationPrompt.DECLINE_TOOL_DESCRIPTION);
        tool.put("input_schema", FlowGenerationPrompt.declineSchema());
        return tool;
    }
}
