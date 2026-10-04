package com.jouney.admin.domain.ai;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Chave de API de um provedor de IA (FT-03 "gerar fluxo por prompt"), configurada pela tela de
 * Integrações em vez de um arquivo de config estático — permite trocar a chave sem reiniciar o
 * servidor. No máximo uma linha por {@link AiProvider} (ver constraint UNIQUE na migration). A
 * linha também guarda o modelo escolhido para o provedor e se ele é o ativo da geração: no máximo
 * um provedor ativo por vez (índice único parcial); sem nenhum ativo, vale o Gemini.
 *
 * TODO(segurança): {@code apiKey} está em texto plano no banco. O princípio de nunca guardar o
 * valor de um segredo em banco de dados (mesmo usado pelo catálogo de credenciais de mensageria,
 * REQ-14.02.003 — lá a solução é apontar pra um Azure Key Vault) foi deliberadamente deixado de
 * lado aqui por decisão explícita do usuário, pendente de implementação de criptografia (ex.:
 * {@code org.springframework.security.crypto.encrypt.Encryptors}, já disponível via
 * spring-boot-starter-security) antes de qualquer uso em produção.
 */
public class AiProviderCredential {

    private final UUID id;
    private final AiProvider provider;
    private String apiKey;
    private String model;
    private boolean active;
    private final OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public AiProviderCredential(UUID id, AiProvider provider, String apiKey, String model, boolean active,
                                 OffsetDateTime createdAt, OffsetDateTime updatedAt) {
        this.id = id;
        this.provider = provider;
        this.apiKey = apiKey;
        this.model = model;
        this.active = active;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public static AiProviderCredential create(AiProvider provider, String apiKey, String model) {
        OffsetDateTime now = OffsetDateTime.now();
        return new AiProviderCredential(UUID.randomUUID(), provider, apiKey, blankToNull(model), false, now, now);
    }

    /** Troca a chave só quando uma nova foi informada; o modelo em branco volta ao padrão do provedor. */
    public void update(String apiKey, String model) {
        if (apiKey != null && !apiKey.isBlank()) {
            this.apiKey = apiKey;
        }
        this.model = blankToNull(model);
        this.updatedAt = OffsetDateTime.now();
    }

    public void setActive(boolean active) {
        this.active = active;
        this.updatedAt = OffsetDateTime.now();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public UUID getId() {
        return id;
    }

    public AiProvider getProvider() {
        return provider;
    }

    public String getApiKey() {
        return apiKey;
    }

    public String getModel() {
        return model;
    }

    public boolean isActive() {
        return active;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
