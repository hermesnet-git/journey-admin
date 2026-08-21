package com.jouney.admin.interfaces.messaging;

import com.jouney.admin.domain.Status;
import com.jouney.admin.domain.messaging.CredentialReference;
import java.time.OffsetDateTime;
import java.util.UUID;

public record CredentialResponse(UUID credentialId, String referenceName, UUID clusterId, String keyVaultUri,
                                  String secretName, Status status, OffsetDateTime createdAt,
                                  OffsetDateTime updatedAt) {

    public static CredentialResponse from(CredentialReference credential) {
        return new CredentialResponse(credential.getId(), credential.getReferenceName(), credential.getClusterId(),
                credential.getKeyVaultUri(), credential.getSecretName(), credential.getStatus(),
                credential.getCreatedAt(), credential.getUpdatedAt());
    }
}
