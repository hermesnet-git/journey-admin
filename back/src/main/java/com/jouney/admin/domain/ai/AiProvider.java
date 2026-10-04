package com.jouney.admin.domain.ai;

/** Provedores de IA suportados pela geração de fluxo por prompt (FT-03). O Gemini é o padrão
 * quando nenhum outro está marcado como ativo na tela de Integrações. {@code defaultModel} vale
 * quando a credencial não informa um modelo; no Gemini ele vem da configuração (gemini.model). */
public enum AiProvider {
    GEMINI(null),
    ANTHROPIC("claude-sonnet-5-5"),
    OPENAI("gpt-4.1"),
    GITHUB_MODELS("openai/gpt-4.1");

    private final String defaultModel;

    AiProvider(String defaultModel) {
        this.defaultModel = defaultModel;
    }

    public String defaultModel() {
        return defaultModel;
    }
}
