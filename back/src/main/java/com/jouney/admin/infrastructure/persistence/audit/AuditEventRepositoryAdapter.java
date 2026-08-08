package com.jouney.admin.infrastructure.persistence.audit;

import com.jouney.admin.domain.audit.AuditEvent;
import com.jouney.admin.domain.audit.AuditEventPage;
import com.jouney.admin.domain.audit.AuditEventRepository;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;

@Component
public class AuditEventRepositoryAdapter implements AuditEventRepository {

    private final AuditEventJpaRepository jpaRepository;

    public AuditEventRepositoryAdapter(AuditEventJpaRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public void save(AuditEvent event) {
        AuditEventJpaEntity entity = new AuditEventJpaEntity(event.id(), event.userId(), event.action(),
                event.resourceType(), event.resourceId(), event.result(), event.correlationId(),
                event.previousValue(), event.newValue(), event.occurredAt());
        jpaRepository.save(entity);
    }

    @Override
    public AuditEventPage search(AuditEventFilter filter, int page, int size) {
        Specification<AuditEventJpaEntity> spec = Specification.allOf();
        if (filter.userId() != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("userId"), filter.userId()));
        }
        if (filter.action() != null && !filter.action().isBlank()) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("action"), filter.action()));
        }
        if (filter.resourceType() != null && !filter.resourceType().isBlank()) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("resourceType"), filter.resourceType()));
        }
        if (filter.resourceId() != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("resourceId"), filter.resourceId()));
        }
        if (filter.result() != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("result"), filter.result()));
        }
        if (filter.correlationId() != null && !filter.correlationId().isBlank()) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("correlationId"), filter.correlationId()));
        }
        if (filter.from() != null) {
            spec = spec.and((root, cq, cb) -> cb.greaterThanOrEqualTo(root.get("occurredAt"), filter.from()));
        }
        if (filter.to() != null) {
            spec = spec.and((root, cq, cb) -> cb.lessThanOrEqualTo(root.get("occurredAt"), filter.to()));
        }

        var pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "occurredAt"));
        var result = jpaRepository.findAll(spec, pageable);
        List<AuditEvent> items = result.getContent().stream().map(AuditEventRepositoryAdapter::toDomain).toList();
        return new AuditEventPage(items, result.getTotalElements(), page, size);
    }

    private static AuditEvent toDomain(AuditEventJpaEntity entity) {
        return new AuditEvent(entity.getId(), entity.getUserId(), entity.getAction(), entity.getResourceType(),
                entity.getResourceId(), entity.getResult(), entity.getCorrelationId(), entity.getPreviousValue(),
                entity.getNewValue(), entity.getOccurredAt());
    }
}
