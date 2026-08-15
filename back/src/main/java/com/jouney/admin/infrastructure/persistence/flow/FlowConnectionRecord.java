package com.jouney.admin.infrastructure.persistence.flow;

// isDefault is boxed (not primitive boolean) so flow/publication JSON persisted before FT-03.11
// (no isDefault key at all) still deserializes — Jackson maps the missing key to null, which fails
// FAIL_ON_NULL_FOR_PRIMITIVES against a primitive. Callers treat null the same as false.
public record FlowConnectionRecord(String id, String sourceNodeId, String targetNodeId, String condition,
                                    Boolean isDefault) {

    public boolean isDefaultOrFalse() {
        return Boolean.TRUE.equals(isDefault);
    }
}
