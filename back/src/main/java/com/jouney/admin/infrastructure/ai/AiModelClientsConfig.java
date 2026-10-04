package com.jouney.admin.infrastructure.ai;

import com.jouney.admin.domain.ai.AiProvider;
import java.util.Map;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.ObjectMapper;

/** OpenAI e GitHub Models dividem o mesmo cliente; só o endereço e os cabeçalhos mudam. */
@Configuration
public class AiModelClientsConfig {

    @Bean
    AiModelClient openAiModelClient(ObjectMapper objectMapper) {
        return new OpenAiCompatibleModelClient(AiProvider.OPENAI, "da OpenAI", "https://api.openai.com",
                "/v1/chat/completions", Map.of(), objectMapper);
    }

    @Bean
    AiModelClient githubModelsModelClient(ObjectMapper objectMapper) {
        return new OpenAiCompatibleModelClient(AiProvider.GITHUB_MODELS, "do GitHub Models", "https://models.github.ai",
                "/inference/chat/completions",
                Map.of("Accept", "application/vnd.github+json", "X-GitHub-Api-Version", "2022-11-28"), objectMapper);
    }
}
