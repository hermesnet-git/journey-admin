package com.jouney.admin.infrastructure.persistence.ai;

import com.jouney.admin.domain.ai.AiProvider;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiProviderCredentialJpaRepository extends JpaRepository<AiProviderCredentialJpaEntity, UUID> {

    Optional<AiProviderCredentialJpaEntity> findByProvider(AiProvider provider);

    Optional<AiProviderCredentialJpaEntity> findByActiveTrue();

    void deleteByProvider(AiProvider provider);
}
