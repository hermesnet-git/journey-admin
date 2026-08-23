package com.jouney.admin.domain.ai;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Chave de API de um provedor de IA (FT-03 "gerar fluxo por prompt"), configurada pela tela de
 * Integrações em vez de um arquivo de config estático — permite trocar a chave sem reiniciar o
 * servidor. No máximo uma linha por {@link AiProvider} (ver constraint UNIQUE na migration).
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
    private final OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public AiProviderCredential(UUID id, AiProvider provider, String apiKey, OffsetDateTime createdAt,
                                 OffsetDateTime updatedAt) {
        this.id = id;
        this.provider = provider;
        this.apiKey = apiKey;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public static AiProviderCredential create(AiProvider provider, String apiKey) {
        OffsetDateTime now = OffsetDateTime.now();
        return new AiProviderCredential(UUID.randomUUID(), provider, apiKey, now, now);
    }

    public void updateApiKey(String apiKey) {
        this.apiKey = apiKey;
        this.updatedAt = OffsetDateTime.now();
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

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
