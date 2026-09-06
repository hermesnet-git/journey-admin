package com.jouney.admin.infrastructure.persistence.componentregistry;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ComponentDefinitionJpaRepository extends JpaRepository<ComponentDefinitionJpaEntity, UUID> {

    Optional<ComponentDefinitionJpaEntity> findByTypeAndVersion(String type, String version);

    List<ComponentDefinitionJpaEntity> findAllByOrderByLevelAscCategoryAscTypeAsc();
}
