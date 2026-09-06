package com.jouney.admin.infrastructure.persistence.componentregistry;

import com.jouney.admin.domain.componentregistry.ComponentDefinition;
import com.jouney.admin.domain.componentregistry.ComponentDefinitionRepository;
import com.jouney.admin.domain.componentregistry.PropDescriptor;
import com.jouney.admin.domain.componentregistry.TargetSupport;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

@Component
public class ComponentDefinitionRepositoryAdapter implements ComponentDefinitionRepository {

    private final ComponentDefinitionJpaRepository jpaRepository;
    private final ObjectMapper objectMapper;

    public ComponentDefinitionRepositoryAdapter(ComponentDefinitionJpaRepository jpaRepository, ObjectMapper objectMapper) {
        this.jpaRepository = jpaRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    public ComponentDefinition save(ComponentDefinition definition) {
        ComponentDefinitionJpaEntity entity = new ComponentDefinitionJpaEntity(definition.getId(), definition.getType(),
                definition.getVersion(), definition.getStatus(), definition.getLevel(), definition.getCategory(),
                definition.isAllowsChildren(), writeJson(definition.getAllowedChildTypes()),
                writeJson(definition.getPropsSchema()), writeJson(definition.getEvents()),
                writeJson(definition.getSupportedTargets()), definition.getCreatedAt(), definition.getUpdatedAt());
        return toDomain(jpaRepository.save(entity));
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ComponentDefinition> findById(UUID id) {
        return jpaRepository.findById(id).map(this::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ComponentDefinition> findByTypeAndVersion(String type, String version) {
        return jpaRepository.findByTypeAndVersion(type, version).map(this::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ComponentDefinition> findAll() {
        return jpaRepository.findAllByOrderByLevelAscCategoryAscTypeAsc().stream().map(this::toDomain).toList();
    }

    private ComponentDefinition toDomain(ComponentDefinitionJpaEntity entity) {
        List<String> allowedChildTypes = readJson(entity.getAllowedChildTypes(), new TypeReference<List<String>>() {
        });
        List<PropDescriptor> propsSchema = readJson(entity.getPropsSchema(), new TypeReference<List<PropDescriptor>>() {
        });
        List<String> events = readJson(entity.getEvents(), new TypeReference<List<String>>() {
        });
        var supportedTargets = readJson(entity.getSupportedTargets(),
                new TypeReference<java.util.Map<String, TargetSupport>>() {
                });
        return new ComponentDefinition(entity.getId(), entity.getType(), entity.getVersion(), entity.getStatus(),
                entity.getLevel(), entity.getCategory(), entity.isAllowsChildren(), allowedChildTypes, propsSchema,
                events, supportedTargets, entity.getCreatedAt(), entity.getUpdatedAt());
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to serialize component definition", e);
        }
    }

    private <T> T readJson(String json, TypeReference<T> type) {
        try {
            return objectMapper.readValue(json, type);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to deserialize component definition", e);
        }
    }
}
