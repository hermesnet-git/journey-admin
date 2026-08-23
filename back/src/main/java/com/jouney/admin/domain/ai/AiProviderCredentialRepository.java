package com.jouney.admin.domain.ai;

import java.util.Optional;

public interface AiProviderCredentialRepository {

    Optional<AiProviderCredential> findByProvider(AiProvider provider);

    AiProviderCredential save(AiProviderCredential credential);

    void deleteByProvider(AiProvider provider);
}
