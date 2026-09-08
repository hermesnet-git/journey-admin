package com.jouney.admin.application.componentregistry;

import com.jouney.admin.application.audit.RecordAuditEvent;
import com.jouney.admin.domain.audit.AuditResult;
import com.jouney.admin.domain.componentregistry.ComponentCategory;
import com.jouney.admin.domain.componentregistry.ComponentDefinition;
import com.jouney.admin.domain.componentregistry.ComponentDefinitionRepository;
import com.jouney.admin.domain.componentregistry.ComponentStatus;
import com.jouney.admin.domain.componentregistry.ComponentTypeVersionAlreadyExistsException;
import com.jouney.admin.domain.componentregistry.PropDescriptor;
import com.jouney.admin.domain.componentregistry.TargetSupport;
import java.util.List;
import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

@Service
public class CreateComponentDefinition {

    private final ComponentDefinitionRepository repository;
    private final RecordAuditEvent recordAuditEvent;

    public CreateComponentDefinition(ComponentDefinitionRepository repository, RecordAuditEvent recordAuditEvent) {
        this.repository = repository;
        this.recordAuditEvent = recordAuditEvent;
    }

    public ComponentDefinition execute(String type, String version, ComponentStatus status, int level,
                                        ComponentCategory category, boolean allowsChildren,
                                        List<String> allowedChildTypes, List<PropDescriptor> propsSchema,
                                        List<String> events, List<String> allowedReservedFields,
                                        Map<String, TargetSupport> supportedTargets) {
        ComponentDefinition definition;
        try {
            definition = repository.save(ComponentDefinition.create(type, version, status, level, category,
                    allowsChildren, allowedChildTypes, propsSchema, events, allowedReservedFields, supportedTargets));
        } catch (DataIntegrityViolationException e) {
            throw new ComponentTypeVersionAlreadyExistsException(type, version);
        }
        recordAuditEvent.record("COMPONENT_DEFINITION_CREATE", "COMPONENT_DEFINITION", definition.getId(),
                AuditResult.SUCCESS);
        return definition;
    }
}
