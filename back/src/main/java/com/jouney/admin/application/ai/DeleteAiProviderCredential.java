package com.jouney.admin.application.ai;

import com.jouney.admin.domain.ai.AiProvider;
import com.jouney.admin.domain.ai.AiProviderCredentialRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DeleteAiProviderCredential {

    private final AiProviderCredentialRepository repository;

    public DeleteAiProviderCredential(AiProviderCredentialRepository repository) {
        this.repository = repository;
    }

    // deleteByProvider é uma query derivada custom (não deleteById, o método base do JpaRepository
    // já transacional por si — ver SimpleJpaRepository) — precisa de transação explícita aqui, senão
    // "TransactionRequiredException: No EntityManager with actual transaction available ... 'remove'".
    @Transactional
    public void execute(AiProvider provider) {
        repository.deleteByProvider(provider);
    }
}
