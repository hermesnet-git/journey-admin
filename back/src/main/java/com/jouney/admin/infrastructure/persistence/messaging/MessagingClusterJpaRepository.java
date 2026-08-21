package com.jouney.admin.infrastructure.persistence.messaging;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface MessagingClusterJpaRepository extends JpaRepository<MessagingClusterJpaEntity, UUID>,
        JpaSpecificationExecutor<MessagingClusterJpaEntity> {
}
