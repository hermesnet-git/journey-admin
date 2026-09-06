package com.jouney.admin.domain.componentregistry;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ComponentDefinitionRepository {

    ComponentDefinition save(ComponentDefinition definition);

    Optional<ComponentDefinition> findById(UUID id);

    Optional<ComponentDefinition> findByTypeAndVersion(String type, String version);

    List<ComponentDefinition> findAll();
}
