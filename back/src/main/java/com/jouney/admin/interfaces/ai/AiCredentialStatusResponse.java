package com.jouney.admin.interfaces.ai;

import com.jouney.admin.domain.ai.AiProviderCredential;
import java.time.OffsetDateTime;

// Nunca carrega o valor da chave — só se está configurada e quando mudou pela última vez, o
// bastante pra tela mostrar status sem nunca reexibir um segredo já salvo.
public record AiCredentialStatusResponse(boolean configured, OffsetDateTime updatedAt) {

    public static AiCredentialStatusResponse notConfigured() {
        return new AiCredentialStatusResponse(false, null);
    }

    public static AiCredentialStatusResponse from(AiProviderCredential credential) {
        return new AiCredentialStatusResponse(true, credential.getUpdatedAt());
    }
}
