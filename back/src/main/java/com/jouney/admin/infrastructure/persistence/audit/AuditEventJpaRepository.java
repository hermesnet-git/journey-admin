package com.jouney.admin.infrastructure.persistence.audit;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AuditEventJpaRepository extends JpaRepository<AuditEventJpaEntity, UUID>,
        JpaSpecificationExecutor<AuditEventJpaEntity> {
}
