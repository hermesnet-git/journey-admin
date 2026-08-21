package com.jouney.admin.interfaces.messaging;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record CredentialInput(
        @NotBlank @Size(max = 150) String referenceName,
        @NotNull UUID clusterId,
        @NotBlank @Size(max = 300) String keyVaultUri,
        @NotBlank @Size(max = 150) String secretName) {
}
