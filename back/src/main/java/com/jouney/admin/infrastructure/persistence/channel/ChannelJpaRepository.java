package com.jouney.admin.infrastructure.persistence.channel;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ChannelJpaRepository extends JpaRepository<ChannelJpaEntity, UUID>,
        JpaSpecificationExecutor<ChannelJpaEntity> {
}
