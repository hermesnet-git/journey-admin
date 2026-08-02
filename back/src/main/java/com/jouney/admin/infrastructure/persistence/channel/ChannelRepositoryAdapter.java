package com.jouney.admin.infrastructure.persistence.channel;

import com.jouney.admin.domain.Status;
import com.jouney.admin.domain.channel.Channel;
import com.jouney.admin.domain.channel.ChannelRepository;
import com.jouney.admin.domain.channel.ChannelType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;

@Component
public class ChannelRepositoryAdapter implements ChannelRepository {

    private final ChannelJpaRepository jpaRepository;

    public ChannelRepositoryAdapter(ChannelJpaRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public Channel save(Channel channel) {
        ChannelJpaEntity entity = new ChannelJpaEntity(channel.getId(), channel.getProductId(),
                channel.getName(), channel.getDescription(), channel.getType(), channel.getStatus(),
                channel.getCreatedAt(), channel.getUpdatedAt());
        return toDomain(jpaRepository.save(entity));
    }

    @Override
    public Optional<Channel> findById(UUID id) {
        return jpaRepository.findById(id).map(ChannelRepositoryAdapter::toDomain);
    }

    @Override
    public List<Channel> search(UUID productId, String query, ChannelType type, Status status) {
        Specification<ChannelJpaEntity> spec = (root, cq, cb) -> cb.equal(root.get("productId"), productId);
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
        return jpaRepository.findAll(spec).stream().map(ChannelRepositoryAdapter::toDomain).toList();
    }

    private static Channel toDomain(ChannelJpaEntity entity) {
        return new Channel(entity.getId(), entity.getProductId(), entity.getName(),
                entity.getDescription(), entity.getType(), entity.getStatus(), entity.getCreatedAt(),
                entity.getUpdatedAt());
    }
}
