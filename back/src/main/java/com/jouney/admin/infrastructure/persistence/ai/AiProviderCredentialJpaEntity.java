package com.jouney.admin.infrastructure.persistence.ai;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;
import com.jouney.admin.domain.ai.AiProvider;

@Entity
@Table(name = "ai_provider_credential")
public class AiProviderCredentialJpaEntity {

    @Id
    @Column(name = "credential_id")
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider", nullable = false, unique = true)
    private AiProvider provider;

    @Column(name = "api_key", nullable = false)
    private String apiKey;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected AiProviderCredentialJpaEntity() {
    }

    public AiProviderCredentialJpaEntity(UUID id, AiProvider provider, String apiKey, OffsetDateTime createdAt,
                                          OffsetDateTime updatedAt) {
        this.id = id;
        this.provider = provider;
        this.apiKey = apiKey;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
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
