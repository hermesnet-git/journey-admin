package com.jouney.admin.domain.componentregistry;

import java.util.UUID;

public class ComponentDefinitionNotFoundException extends RuntimeException {

    public ComponentDefinitionNotFoundException(UUID id) {
        super("Component definition not found: " + id);
    }
}
