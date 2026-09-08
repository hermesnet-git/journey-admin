package com.jouney.admin.interfaces.componentregistry;

import com.jouney.admin.domain.componentregistry.ComponentCategory;
import com.jouney.admin.domain.componentregistry.ComponentStatus;
import com.jouney.admin.domain.componentregistry.PropDescriptor;
import com.jouney.admin.domain.componentregistry.TargetSupport;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.Map;

public record ComponentDefinitionInput(@NotBlank String type, @NotBlank String version,
                                        @NotNull ComponentStatus status, @Min(0) int level,
                                        @NotNull ComponentCategory category, boolean allowsChildren,
                                        List<String> allowedChildTypes, List<PropDescriptor> propsSchema,
                                        List<String> events, List<String> allowedReservedFields,
                                        Map<String, TargetSupport> supportedTargets) {
}
