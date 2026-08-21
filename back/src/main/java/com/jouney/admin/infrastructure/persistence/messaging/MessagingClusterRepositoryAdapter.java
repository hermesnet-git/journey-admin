package com.jouney.admin.infrastructure.persistence.messaging;

import com.jouney.admin.domain.Status;
import com.jouney.admin.domain.messaging.ClusterType;
import com.jouney.admin.domain.messaging.MessagingCluster;
import com.jouney.admin.domain.messaging.MessagingClusterRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;

@Component
public class MessagingClusterRepositoryAdapter implements MessagingClusterRepository {

    private final MessagingClusterJpaRepository jpaRepository;

    public MessagingClusterRepositoryAdapter(MessagingClusterJpaRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public MessagingCluster save(MessagingCluster cluster) {
        MessagingClusterJpaEntity entity = new MessagingClusterJpaEntity(cluster.getId(), cluster.getName(),
                cluster.getType(), cluster.getConnectionAddress(), cluster.getStatus(), cluster.getCreatedAt(),
                cluster.getUpdatedAt());
        return toDomain(jpaRepository.save(entity));
    }

    @Override
    public Optional<MessagingCluster> findById(UUID id) {
        return jpaRepository.findById(id).map(MessagingClusterRepositoryAdapter::toDomain);
    }

    @Override
    public List<MessagingCluster> search(String query, ClusterType type, Status status) {
        Specification<MessagingClusterJpaEntity> spec = Specification.allOf();
        if (query != null && !query.isBlank()) {
            String like = "%" + query.toLowerCase() + "%";
            spec = spec.and((root, cq, cb) -> cb.like(cb.lower(root.get("name")), like));
        }
        if (type != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("type"), type));
        }
        if (status != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("status"), status));
        }
        return jpaRepository.findAll(spec).stream().map(MessagingClusterRepositoryAdapter::toDomain).toList();
    }

    private static MessagingCluster toDomain(MessagingClusterJpaEntity entity) {
        return new MessagingCluster(entity.getId(), entity.getName(), entity.getType(),
                entity.getConnectionAddress(), entity.getStatus(), entity.getCreatedAt(), entity.getUpdatedAt());
    }
}
