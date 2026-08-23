package com.jouney.admin.application.ai;

import com.jouney.admin.domain.ai.AiProvider;
import com.jouney.admin.domain.ai.AiProviderCredential;
import com.jouney.admin.domain.ai.AiProviderCredentialRepository;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Só se está configurado e quando foi atualizado pela última vez — nunca devolve o valor da
 * chave de volta pro front (mesma prática de nunca reexibir um segredo depois de salvo). */
@Service
public class GetAiProviderCredentialStatus {

    private final AiProviderCredentialRepository repository;

    public GetAiProviderCredentialStatus(AiProviderCredentialRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public Optional<AiProviderCredential> execute(AiProvider provider) {
        return repository.findByProvider(provider);
    }
}
