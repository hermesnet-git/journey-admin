package com.jouney.admin.infrastructure.ai;

import com.jouney.admin.domain.ai.AiProvider;
import java.util.List;
import java.util.Map;
import tools.jackson.databind.JsonNode;

/**
 * Porta mínima de chamada a um modelo de IA: manda um prompt de sistema e um do usuário, obriga o
 * modelo a responder chamando UMA das ferramentas oferecidas e devolve qual foi e com quais
 * argumentos. Cada provedor fala o seu protocolo (Gemini, Messages da Anthropic, chat da OpenAI);
 * quem gera o fluxo não sabe qual está por trás, só recebe o JSON dos argumentos.
 */
public interface AiModelClient {

    AiProvider provider();

    ToolCall call(String apiKey, String model, String systemPrompt, String userPrompt, List<ToolSpec> tools);

    /** Ferramenta oferecida ao modelo; {@code parameters} é um JSON Schema puro. */
    record ToolSpec(String name, String description, Map<String, Object> parameters) {
    }

    record ToolCall(String name, JsonNode args) {
    }
}
