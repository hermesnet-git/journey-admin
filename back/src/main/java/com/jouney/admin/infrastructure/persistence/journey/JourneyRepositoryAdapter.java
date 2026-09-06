package com.jouney.admin.infrastructure.persistence.journey;

import com.jouney.admin.domain.channel.ChannelType;
import com.jouney.admin.domain.journey.Journey;
import com.jouney.admin.domain.journey.JourneyRepository;
import com.jouney.admin.domain.journey.JourneySort;
import com.jouney.admin.domain.journey.JourneyStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;

@Component
public class JourneyRepositoryAdapter implements JourneyRepository {

    private final JourneyJpaRepository jpaRepository;

    public JourneyRepositoryAdapter(JourneyJpaRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public Journey save(Journey journey) {
        JourneyJpaEntity entity = new JourneyJpaEntity(journey.getId(), journey.getProductId(),
                journey.getChannelTypes(), journey.getName(), journey.getDescription(), journey.getStatus(),
                journey.getCreatedAt(), journey.getUpdatedAt());
        return toDomain(jpaRepository.save(entity));
    }

    @Override
    public Optional<Journey> findById(UUID id) {
        return jpaRepository.findById(id).map(JourneyRepositoryAdapter::toDomain);
    }

    @Override
    public void deleteById(UUID id) {
        jpaRepository.deleteById(id);
    }

    @Override
    public List<Journey> search(UUID productId, ChannelType channelType, String query, JourneyStatus status,
                                 JourneySort sort) {
        Specification<JourneyJpaEntity> spec = Specification.allOf();
        if (status != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("status"), status));
        }
        if (channelType != null) {
            spec = spec.and((root, cq, cb) -> {
                cq.distinct(true);
                return cb.equal(root.join("channelTypes"), channelType);
            });
        }
        if (productId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("productId"), productId));
        }
        if (query != null && !query.isBlank()) {
            String like = "%" + query.toLowerCase() + "%";
            spec = spec.and((root, cq, cb) -> cb.like(cb.lower(root.get("name")), like));
        }
        String sortProperty = sort == JourneySort.CREATED_AT ? "createdAt" : "updatedAt";
        return jpaRepository.findAll(spec, Sort.by(Sort.Direction.DESC, sortProperty)).stream()
                .map(JourneyRepositoryAdapter::toDomain)
                .toList();
    }

    private static Journey toDomain(JourneyJpaEntity entity) {
        return new Journey(entity.getId(), entity.getProductId(), entity.getChannelTypes(), entity.getName(),
                entity.getDescription(), entity.getStatus(), entity.getCreatedAt(), entity.getUpdatedAt());
    }
}
