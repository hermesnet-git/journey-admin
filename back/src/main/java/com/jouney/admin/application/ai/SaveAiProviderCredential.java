package com.jouney.admin.application.ai;

import com.jouney.admin.domain.ai.AiProvider;
import com.jouney.admin.domain.ai.AiProviderCredential;
import com.jouney.admin.domain.ai.AiProviderCredentialRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Cria ou substitui (upsert por provider — no máximo uma credencial por provedor, ver constraint
 * UNIQUE) a chave de API de um provedor de IA. */
@Service
public class SaveAiProviderCredential {

    private final AiProviderCredentialRepository repository;

    public SaveAiProviderCredential(AiProviderCredentialRepository repository) {
        this.repository = repository;
    }

    // findByProvider é query derivada custom, igual deleteByProvider em DeleteAiProviderCredential —
    // mesmo motivo pra precisar de transação explícita aqui.
    @Transactional
    public AiProviderCredential execute(AiProvider provider, String apiKey) {
        AiProviderCredential credential = repository.findByProvider(provider).orElse(null);
        if (credential == null) {
            credential = AiProviderCredential.create(provider, apiKey);
        } else {
            credential.updateApiKey(apiKey);
        }
        return repository.save(credential);
    }
}
