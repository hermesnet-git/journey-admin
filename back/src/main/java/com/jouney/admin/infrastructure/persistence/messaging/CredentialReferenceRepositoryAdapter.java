package com.jouney.admin.infrastructure.persistence.messaging;

import com.jouney.admin.domain.Status;
import com.jouney.admin.domain.messaging.CredentialReference;
import com.jouney.admin.domain.messaging.CredentialReferenceRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;

@Component
public class CredentialReferenceRepositoryAdapter implements CredentialReferenceRepository {

    private final CredentialReferenceJpaRepository jpaRepository;

    public CredentialReferenceRepositoryAdapter(CredentialReferenceJpaRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public CredentialReference save(CredentialReference credential) {
        CredentialReferenceJpaEntity entity = new CredentialReferenceJpaEntity(credential.getId(),
                credential.getReferenceName(), credential.getClusterId(), credential.getKeyVaultUri(),
                credential.getSecretName(), credential.getStatus(), credential.getCreatedAt(),
                credential.getUpdatedAt());
        return toDomain(jpaRepository.save(entity));
    }

    @Override
    public Optional<CredentialReference> findById(UUID id) {
        return jpaRepository.findById(id).map(CredentialReferenceRepositoryAdapter::toDomain);
    }

    @Override
    public List<CredentialReference> search(String query, UUID clusterId, Status status) {
        Specification<CredentialReferenceJpaEntity> spec = Specification.allOf();
        if (query != null && !query.isBlank()) {
            String like = "%" + query.toLowerCase() + "%";
            spec = spec.and((root, cq, cb) -> cb.like(cb.lower(root.get("referenceName")), like));
        }
        if (clusterId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("clusterId"), clusterId));
        }
        if (status != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("status"), status));
        }
        return jpaRepository.findAll(spec).stream().map(CredentialReferenceRepositoryAdapter::toDomain).toList();
    }

    private static CredentialReference toDomain(CredentialReferenceJpaEntity entity) {
        return new CredentialReference(entity.getId(), entity.getReferenceName(), entity.getClusterId(),
                entity.getKeyVaultUri(), entity.getSecretName(), entity.getStatus(), entity.getCreatedAt(),
                entity.getUpdatedAt());
    }
}
