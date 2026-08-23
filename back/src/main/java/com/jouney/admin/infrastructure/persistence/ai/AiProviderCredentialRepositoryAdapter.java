package com.jouney.admin.infrastructure.persistence.ai;

import com.jouney.admin.domain.ai.AiProvider;
import com.jouney.admin.domain.ai.AiProviderCredential;
import com.jouney.admin.domain.ai.AiProviderCredentialRepository;
import java.util.Optional;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class AiProviderCredentialRepositoryAdapter implements AiProviderCredentialRepository {

    private final AiProviderCredentialJpaRepository jpaRepository;

    public AiProviderCredentialRepositoryAdapter(AiProviderCredentialJpaRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    // findByProvider/deleteByProvider são queries derivadas custom (não os métodos base do
    // JpaRepository, findById/deleteById/save, que já são transacionais por conta própria via
    // SimpleJpaRepository) — sem @Transactional aqui, um caller sem transação própria (ex.:
    // GeminiFlowGenerator, chamado fora de qualquer @Transactional de camada de aplicação) bate em
    // "TransactionRequiredException: No EntityManager with actual transaction available". Aplicado
    // aqui no adapter (não só nos serviços de aplicação) cobre todo caller de uma vez.
    @Override
    @Transactional(readOnly = true)
    public Optional<AiProviderCredential> findByProvider(AiProvider provider) {
        return jpaRepository.findByProvider(provider).map(AiProviderCredentialRepositoryAdapter::toDomain);
    }

    @Override
    public AiProviderCredential save(AiProviderCredential credential) {
        AiProviderCredentialJpaEntity entity = new AiProviderCredentialJpaEntity(credential.getId(),
                credential.getProvider(), credential.getApiKey(), credential.getCreatedAt(), credential.getUpdatedAt());
        return toDomain(jpaRepository.save(entity));
    }

    @Override
    @Transactional
    public void deleteByProvider(AiProvider provider) {
        jpaRepository.deleteByProvider(provider);
    }

    private static AiProviderCredential toDomain(AiProviderCredentialJpaEntity entity) {
        return new AiProviderCredential(entity.getId(), entity.getProvider(), entity.getApiKey(),
                entity.getCreatedAt(), entity.getUpdatedAt());
    }
}
