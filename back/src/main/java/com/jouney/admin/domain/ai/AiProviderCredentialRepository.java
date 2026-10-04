package com.jouney.admin.domain.ai;

import java.util.Optional;

public interface AiProviderCredentialRepository {

    Optional<AiProviderCredential> findByProvider(AiProvider provider);

    /** O provedor marcado como ativo na geração, se houver. */
    Optional<AiProviderCredential> findActive();

    AiProviderCredential save(AiProviderCredential credential);

    void deleteByProvider(AiProvider provider);
}
