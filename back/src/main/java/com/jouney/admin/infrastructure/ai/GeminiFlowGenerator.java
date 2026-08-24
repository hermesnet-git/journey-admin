package com.jouney.admin.infrastructure.ai;

import com.jouney.admin.domain.ai.AiProvider;
import com.jouney.admin.domain.ai.AiProviderCredentialRepository;
import com.jouney.admin.domain.flow.AiFlowGenerator;
import com.jouney.admin.domain.flow.FlowNode;
import com.jouney.admin.domain.flow.FlowValidationException;
import com.jouney.admin.domain.flow.FlowValidator;
import com.jouney.admin.domain.flow.GeneratedFlow;
import com.jouney.admin.domain.flow.GenerationContext;
import com.jouney.admin.domain.form.FormField;
import com.jouney.admin.domain.form.FormRepository;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Consumer;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Adapter da Gemini API (generateContent) pra AiFlowGenerator (FT-03 "gerar fluxo por prompt") —
 * hoje o único adapter (um anterior pra Anthropic foi removido). Cada tentativa do loop de correção
 * é uma conversa nova de um turno só (não um replay do turno anterior do modelo): modelos Gemini com
 * "thinking" ligado anexam um thought_signature à function call, exigido de volta byte a byte pra
 * continuar a mesma conversa — sem um formato documentado pra REST puro, replicar isso manualmente é
 * frágil. Em vez disso, o que foi gerado antes e o que deu errado entram como texto no próximo
 * prompt — mais simples e não depende de nenhum detalhe não documentado da API.
 */
@Component
public class GeminiFlowGenerator implements AiFlowGenerator {

    private static final int MAX_ATTEMPTS = 5;
    private static final List<Map<String, Object>> TOOLS = List.of(Map.of("functionDeclarations", List.of(
            Map.of("name", FlowGenerationPrompt.TOOL_NAME, "description", FlowGenerationPrompt.TOOL_DESCRIPTION,
                    "parameters", FlowGenerationPrompt.schema()),
            Map.of("name", FlowGenerationPrompt.DECLINE_TOOL_NAME, "description", FlowGenerationPrompt.DECLINE_TOOL_DESCRIPTION,
                    "parameters", FlowGenerationPrompt.declineSchema()))));

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final FormRepository formRepository;
    private final AiProviderCredentialRepository credentialRepository;
    private final String model;

    public GeminiFlowGenerator(ObjectMapper objectMapper, FormRepository formRepository,
                                AiProviderCredentialRepository credentialRepository,
                                @Value("${gemini.model:gemini-3.6-flash}") String model) {
        this.objectMapper = objectMapper;
        this.formRepository = formRepository;
        this.credentialRepository = credentialRepository;
        this.model = model;
        this.restClient = FlowGenerationPrompt.timeoutedRestClientBuilder()
                .baseUrl("https://generativelanguage.googleapis.com").build();
    }

    @Override
    public GeneratedFlow generate(GenerationContext context, Consumer<String> onProgress) {
        // Resolvida a cada chamada (não guardada em campo no construtor) pra uma chave salva pela
        // tela de Integrações valer imediatamente, sem precisar reiniciar o servidor.
        String apiKey = credentialRepository.findByProvider(AiProvider.GEMINI)
                .map(credential -> credential.getApiKey())
                .orElse(null);
        if (apiKey == null || apiKey.isBlank()) {
            throw new AiGenerationException(
                    "Chave de API do Gemini não configurada. Configure em Integrações > Credencial de IA.");
        }

        String basePrompt = FlowGenerationPrompt.buildUserPrompt(context);
        String currentPrompt = basePrompt;
        Map<String, FlowNode> existingNodesById = context.currentFlowNodes().stream()
                .collect(Collectors.toMap(FlowNode::getId, n -> n));

        FlowValidationException lastViolation = null;
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            onProgress.accept("Tentativa " + attempt + "/" + MAX_ATTEMPTS + ": chamando Gemini (" + model + ")...");
            long start = System.currentTimeMillis();
            List<Map<String, Object>> contents = List.of(
                    Map.of("role", "user", "parts", List.of(Map.of("text", currentPrompt))));
            JsonNode functionCall = callGemini(contents, apiKey);
            onProgress.accept("Tentativa " + attempt + ": resposta recebida em "
                    + String.format("%.1fs", (System.currentTimeMillis() - start) / 1000.0) + ".");
            if (FlowGenerationPrompt.DECLINE_TOOL_NAME.equals(functionCall.path("name").asText())) {
                throw new AiRequestDeclinedException(functionCall.path("args").path("reason").asText());
            }
            FlowGenerationPrompt.LlmFlowOutput output;
            try {
                output = objectMapper.treeToValue(functionCall.get("args"), FlowGenerationPrompt.LlmFlowOutput.class);
            } catch (Exception ex) {
                throw new AiGenerationException("Resposta da IA em formato inesperado: " + ex.getMessage(), ex);
            }
            if (!output.newForms().isEmpty()) {
                onProgress.accept("Tentativa " + attempt + ": criando " + output.newForms().size() + " formulário(s) novo(s)...");
            }
            // Persiste os newForms como templates reutilizáveis no catálogo (efeito colateral —
            // Form.create/save); os campos que de fato viram a tela do nó são uma cópia à parte,
            // resolvida logo abaixo (newFormFields/existingFormFields), nunca uma referência viva.
            FlowGenerationPrompt.createNewForms(formRepository, output.newForms());
            Map<String, List<FormField>> newFormFields = FlowGenerationPrompt.newFormFieldsByLocalId(output.newForms());
            Map<UUID, List<FormField>> existingFormFields = resolveExistingFormFields(output.nodes());
            GeneratedFlow candidate = FlowGenerationPrompt.toDomain(output, newFormFields, existingFormFields, existingNodesById);
            onProgress.accept("Tentativa " + attempt + ": " + FlowGenerationPrompt.describeFlow(candidate) + " — validando...");
            try {
                FlowValidator.validate(candidate.nodes(), candidate.connections());
                onProgress.accept("Tentativa " + attempt + ": fluxo válido.");
                return candidate;
            } catch (FlowValidationException ex) {
                lastViolation = ex;
                if (attempt == MAX_ATTEMPTS) {
                    throw ex;
                }
                FlowGenerationPrompt.reportViolations(onProgress, attempt, ex.getViolations());
                onProgress.accept("Pedindo correção pro modelo...");
                String violations = String.join("; ", ex.getViolations());
                // Conversa nova por tentativa (não um replay do turno anterior) — ver javadoc da classe.
                currentPrompt = basePrompt + "\n\nVocê já tentou gerar esse fluxo antes e produziu:\n"
                        + functionCall.get("args") + "\n\nMas esse fluxo tem os seguintes problemas — corrija e gere "
                        + "de novo, do zero, chamando generate_flow: " + violations;
            }
        }
        throw lastViolation;
    }

    // Campos dos formulários do catálogo que algum nó da tentativa atual referencia por formId
    // (existente, não newFormId) — resolvidos uma vez por id distinto, copiados pro embeddedScreen
    // do(s) nó(s) correspondentes em FlowGenerationPrompt.toDomain, nunca guardados como referência.
    private Map<UUID, List<FormField>> resolveExistingFormFields(List<FlowGenerationPrompt.LlmNode> nodes) {
        Map<UUID, List<FormField>> result = new HashMap<>();
        for (var node : nodes) {
            UUID formId = FlowGenerationPrompt.parseUuidOrNull(node.formId());
            if (formId != null && !result.containsKey(formId)) {
                formRepository.findById(formId).ifPresent(form -> result.put(formId, form.getFields()));
            }
        }
        return result;
    }

    private JsonNode callGemini(List<Map<String, Object>> contents, String apiKey) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("contents", contents);
        body.put("systemInstruction", Map.of("parts", List.of(Map.of("text", FlowGenerationPrompt.SYSTEM_PROMPT))));
        body.put("tools", TOOLS);
        body.put("toolConfig", Map.of("functionCallingConfig", Map.of("mode", "ANY", "allowedFunctionNames",
                List.of(FlowGenerationPrompt.TOOL_NAME, FlowGenerationPrompt.DECLINE_TOOL_NAME))));

        JsonNode response;
        try {
            response = restClient.post()
                    .uri("/v1beta/models/{model}:generateContent", model)
                    .header("x-goog-api-key", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);
        } catch (RestClientResponseException ex) {
            throw new AiGenerationException(
                    "Falha ao chamar a API do Gemini (" + ex.getStatusCode() + "): " + ex.getResponseBodyAsString(), ex);
        } catch (ResourceAccessException ex) {
            throw new AiGenerationException("Não foi possível conectar à API do Gemini.", ex);
        }

        for (JsonNode part : response.path("candidates").path(0).path("content").path("parts")) {
            if (part.has("functionCall")) {
                return part.get("functionCall");
            }
        }
        throw new AiGenerationException("A resposta da IA não incluiu uma chamada de função. Resposta bruta: " + response);
    }
}
