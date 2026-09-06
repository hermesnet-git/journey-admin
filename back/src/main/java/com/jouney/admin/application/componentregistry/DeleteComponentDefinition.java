package com.jouney.admin.application.componentregistry;

import com.jouney.admin.application.audit.RecordAuditEvent;
import com.jouney.admin.domain.audit.AuditResult;
import com.jouney.admin.domain.componentregistry.ComponentDefinition;
import com.jouney.admin.domain.componentregistry.ComponentDefinitionNotFoundException;
import com.jouney.admin.domain.componentregistry.ComponentDefinitionRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;

/** Nunca apaga a linha — telas já publicadas antes da remoção continuam referenciando o
 * type+version (regra de compatibilidade 8 do catálogo: só REMOVED bloqueia publicação nova). */
@Service
public class DeleteComponentDefinition {

    private final ComponentDefinitionRepository repository;
    private final RecordAuditEvent recordAuditEvent;

    public DeleteComponentDefinition(ComponentDefinitionRepository repository, RecordAuditEvent recordAuditEvent) {
        this.repository = repository;
        this.recordAuditEvent = recordAuditEvent;
    }

    public void execute(UUID id) {
        ComponentDefinition definition = repository.findById(id)
                .orElseThrow(() -> new ComponentDefinitionNotFoundException(id));
        definition.markRemoved();
        repository.save(definition);
        recordAuditEvent.record("COMPONENT_DEFINITION_REMOVE", "COMPONENT_DEFINITION", id, AuditResult.SUCCESS);
    }
}
