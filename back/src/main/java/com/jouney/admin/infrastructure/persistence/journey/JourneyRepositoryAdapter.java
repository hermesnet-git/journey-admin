package com.jouney.admin.infrastructure.persistence.journey;

import com.jouney.admin.domain.journey.Journey;
import com.jouney.admin.domain.journey.JourneyRepository;
import com.jouney.admin.domain.journey.JourneySort;
import com.jouney.admin.infrastructure.persistence.channel.ChannelJpaEntity;
import jakarta.persistence.criteria.Subquery;
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
        JourneyJpaEntity entity = new JourneyJpaEntity(journey.getId(), journey.getChannelId(), journey.getName(),
                journey.getDescription(), journey.getStatus(), journey.getCreatedAt(), journey.getUpdatedAt());
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
    public List<Journey> search(UUID productId, UUID channelId, String query, JourneySort sort) {
        Specification<JourneyJpaEntity> spec = Specification.allOf();
        if (channelId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("channelId"), channelId));
        }
        if (productId != null) {
            spec = spec.and((root, cq, cb) -> {
                Subquery<UUID> subquery = cq.subquery(UUID.class);
                var channelRoot = subquery.from(ChannelJpaEntity.class);
                subquery.select(channelRoot.get("id")).where(cb.equal(channelRoot.get("productId"), productId));
                return root.get("channelId").in(subquery);
            });
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
        return new Journey(entity.getId(), entity.getChannelId(), entity.getName(), entity.getDescription(),
                entity.getStatus(), entity.getCreatedAt(), entity.getUpdatedAt());
    }
}
