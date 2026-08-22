package com.jouney.admin.infrastructure.persistence.messaging;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "credential_reference")
public class CredentialReferenceJpaEntity {

    @Id
    @Column(name = "credential_id")
    private UUID id;

    @Column(name = "reference_name", nullable = false)
    private String referenceName;

    @Column(name = "cluster_id", nullable = false)
    private UUID clusterId;

    @Column(name = "key_vault_uri", nullable = false)
    private String keyVaultUri;

    @Column(name = "secret_name", nullable = false)
    private String secretName;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected CredentialReferenceJpaEntity() {
    }

    public CredentialReferenceJpaEntity(UUID id, String referenceName, UUID clusterId, String keyVaultUri,
                                         String secretName, OffsetDateTime createdAt, OffsetDateTime updatedAt) {
        this.id = id;
        this.referenceName = referenceName;
        this.clusterId = clusterId;
        this.keyVaultUri = keyVaultUri;
        this.secretName = secretName;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
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

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
