package com.jouney.admin.domain.messaging;

import com.jouney.admin.domain.Status;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Referência de credencial cadastrada no catálogo (FT-14, US-14.02). Aponta pra um secret mantido
 * no Azure Key Vault da empresa — nunca guarda o valor do segredo em si (REQ-14.02.003).
 */
public class CredentialReference {

    private final UUID id;
    private String referenceName;
    private UUID clusterId;
    private String keyVaultUri;
    private String secretName;
    private Status status;
    private final OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public CredentialReference(UUID id, String referenceName, UUID clusterId, String keyVaultUri,
                                String secretName, Status status, OffsetDateTime createdAt, OffsetDateTime updatedAt) {
        this.id = id;
        this.referenceName = referenceName;
        this.clusterId = clusterId;
        this.keyVaultUri = keyVaultUri;
        this.secretName = secretName;
        this.status = status;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public static CredentialReference create(String referenceName, UUID clusterId, String keyVaultUri,
                                               String secretName) {
        OffsetDateTime now = OffsetDateTime.now();
        return new CredentialReference(UUID.randomUUID(), referenceName, clusterId, keyVaultUri, secretName,
                Status.ACTIVE, now, now);
    }

    public void update(String referenceName, UUID clusterId, String keyVaultUri, String secretName) {
        this.referenceName = referenceName;
        this.clusterId = clusterId;
        this.keyVaultUri = keyVaultUri;
        this.secretName = secretName;
        this.updatedAt = OffsetDateTime.now();
    }

    public void deactivate() {
        this.status = Status.INACTIVE;
        this.updatedAt = OffsetDateTime.now();
    }

    public void activate() {
        this.status = Status.ACTIVE;
        this.updatedAt = OffsetDateTime.now();
    }

    public boolean isActive() {
        return status == Status.ACTIVE;
    }

    public UUID getId() {
        return id;
    }

    public String getReferenceName() {
        return referenceName;
    }

    public UUID getClusterId() {
        return clusterId;
    }

    public String getKeyVaultUri() {
        return keyVaultUri;
    }

    public String getSecretName() {
        return secretName;
    }

    public Status getStatus() {
        return status;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
