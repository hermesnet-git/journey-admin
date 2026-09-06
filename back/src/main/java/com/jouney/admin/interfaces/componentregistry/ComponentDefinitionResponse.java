package com.jouney.admin.interfaces.componentregistry;

import com.jouney.admin.domain.componentregistry.ComponentCategory;
import com.jouney.admin.domain.componentregistry.ComponentDefinition;
import com.jouney.admin.domain.componentregistry.ComponentStatus;
import com.jouney.admin.domain.componentregistry.PropDescriptor;
import com.jouney.admin.domain.componentregistry.TargetSupport;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record ComponentDefinitionResponse(UUID id, String type, String version, ComponentStatus status, int level,
                                           ComponentCategory category, boolean allowsChildren,
                                           List<String> allowedChildTypes, List<PropDescriptor> propsSchema,
                                           List<String> events, Map<String, TargetSupport> supportedTargets,
                                           OffsetDateTime createdAt, OffsetDateTime updatedAt) {

    public static ComponentDefinitionResponse from(ComponentDefinition definition) {
        return new ComponentDefinitionResponse(definition.getId(), definition.getType(), definition.getVersion(),
                definition.getStatus(), definition.getLevel(), definition.getCategory(),
                definition.isAllowsChildren(), definition.getAllowedChildTypes(), definition.getPropsSchema(),
                definition.getEvents(), definition.getSupportedTargets(), definition.getCreatedAt(),
                definition.getUpdatedAt());
    }
}
