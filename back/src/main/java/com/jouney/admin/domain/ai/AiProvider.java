package com.jouney.admin.domain.ai;

/** Provedores de IA suportados pela geração de fluxo por prompt (FT-03). Hoje só Gemini — o
 * adapter Anthropic existiu e foi removido; um valor só aqui documenta o domínio válido e deixa
 * a porta pronta caso um segundo provedor volte a fazer sentido. */
public enum AiProvider {
    GEMINI
}
