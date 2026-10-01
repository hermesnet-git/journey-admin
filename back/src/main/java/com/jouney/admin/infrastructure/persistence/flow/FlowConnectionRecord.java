package com.jouney.admin.infrastructure.persistence.flow;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.jouney.admin.domain.flow.FlowConnection;

// isDefault is boxed (not primitive boolean) so flow/publication JSON persisted before FT-03.11
// (no isDefault key at all) still deserializes — Jackson maps the missing key to null, which fails
// FAIL_ON_NULL_FOR_PRIMITIVES against a primitive. Callers treat null the same as false.
// onError (saída "Se falhar") é boxed pelo mesmo motivo: fluxos gravados antes não têm a chave.
public record FlowConnectionRecord(String id, String sourceNodeId, String targetNodeId, String condition,
                                    Boolean isDefault, Boolean onError,
                                    @JsonInclude(JsonInclude.Include.NON_NULL) String label) {

    public static FlowConnectionRecord from(FlowConnection c) {
        return new FlowConnectionRecord(c.getId(), c.getSourceNodeId(), c.getTargetNodeId(), c.getCondition(),
                c.isDefault(), c.isOnError(), c.getLabel());
    }

    public FlowConnection toDomain() {
        return new FlowConnection(id, sourceNodeId, targetNodeId, condition, isDefaultOrFalse(),
                Boolean.TRUE.equals(onError), label);
    }

    public boolean isDefaultOrFalse() {
        return Boolean.TRUE.equals(isDefault);
    }
}
