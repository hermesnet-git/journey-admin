package com.jouney.admin.infrastructure.persistence.datasource;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DataSourceJpaRepository extends JpaRepository<DataSourceJpaEntity, UUID> {

    Optional<DataSourceJpaEntity> findByName(String name);
}
