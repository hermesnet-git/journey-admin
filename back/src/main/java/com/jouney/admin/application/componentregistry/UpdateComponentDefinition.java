package com.jouney.admin.application.componentregistry;

import com.jouney.admin.application.audit.RecordAuditEvent;
import com.jouney.admin.domain.audit.AuditResult;
import com.jouney.admin.domain.componentregistry.ComponentCategory;
import com.jouney.admin.domain.componentregistry.ComponentDefinition;
import com.jouney.admin.domain.componentregistry.ComponentDefinitionNotFoundException;
import com.jouney.admin.domain.componentregistry.ComponentDefinitionRepository;
import com.jouney.admin.domain.componentregistry.ComponentStatus;
import com.jouney.admin.domain.componentregistry.PropDescriptor;
import com.jouney.admin.domain.componentregistry.TargetSupport;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class UpdateComponentDefinition {

    private final ComponentDefinitionRepository repository;
    private final RecordAuditEvent recordAuditEvent;

    public UpdateComponentDefinition(ComponentDefinitionRepository repository, RecordAuditEvent recordAuditEvent) {
        this.repository = repository;
        this.recordAuditEvent = recordAuditEvent;
    }

    public ComponentDefinition execute(UUID id, ComponentStatus status, int level, ComponentCategory category,
                                        boolean allowsChildren, List<String> allowedChildTypes,
                                        List<PropDescriptor> propsSchema, List<String> events,
                                        List<String> allowedReservedFields,
                                        Map<String, TargetSupport> supportedTargets) {
        ComponentDefinition definition = repository.findById(id)
                .orElseThrow(() -> new ComponentDefinitionNotFoundException(id));
        if (definition.isSystem() && status == ComponentStatus.REMOVED) {
            throw new ComponentDefinition.SystemComponentRemovalException();
        }
        definition.update(status, level, category, allowsChildren, allowedChildTypes, propsSchema, events,
                allowedReservedFields,
                supportedTargets);
        ComponentDefinition saved = repository.save(definition);
        recordAuditEvent.record("COMPONENT_DEFINITION_UPDATE", "COMPONENT_DEFINITION", id, AuditResult.SUCCESS);
        return saved;
    }
}
