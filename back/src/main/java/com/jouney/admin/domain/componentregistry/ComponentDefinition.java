package com.jouney.admin.domain.componentregistry;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Fonte de verdade operacional do catálogo SDUI corporativo (seção 12) — o que o Form Builder pode
 * produzir e o que cada alvo de renderização consegue exibir. {@code type}+{@code version} é a
 * chave de negócio (ver constraint UNIQUE na migration); {@code id} é só a chave técnica.
 */
public class ComponentDefinition {

    private final UUID id;
    private final String type;
    private final String version;
    private ComponentStatus status;
    private int level;
    private ComponentCategory category;
    private boolean allowsChildren;
    private List<String> allowedChildTypes;
    private List<PropDescriptor> propsSchema;
    private List<String> events;
    private Map<String, TargetSupport> supportedTargets;
    private final OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public ComponentDefinition(UUID id, String type, String version, ComponentStatus status, int level,
                                ComponentCategory category, boolean allowsChildren, List<String> allowedChildTypes,
                                List<PropDescriptor> propsSchema, List<String> events,
                                Map<String, TargetSupport> supportedTargets, OffsetDateTime createdAt,
                                OffsetDateTime updatedAt) {
        this.id = id;
        this.type = type;
        this.version = version;
        this.status = status;
        this.level = level;
        this.category = category;
        this.allowsChildren = allowsChildren;
        this.allowedChildTypes = allowedChildTypes == null ? List.of() : allowedChildTypes;
        this.propsSchema = propsSchema == null ? List.of() : propsSchema;
        this.events = events == null ? List.of() : events;
        this.supportedTargets = validateTargetMap(supportedTargets == null ? Map.of() : supportedTargets);
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public static ComponentDefinition create(String type, String version, ComponentStatus status, int level,
                                               ComponentCategory category, boolean allowsChildren,
                                               List<String> allowedChildTypes, List<PropDescriptor> propsSchema,
                                               List<String> events, Map<String, TargetSupport> supportedTargets) {
        OffsetDateTime now = OffsetDateTime.now();
        return new ComponentDefinition(UUID.randomUUID(), type, version, status, level, category, allowsChildren,
                allowedChildTypes, propsSchema, events, supportedTargets, now, now);
    }

    public void update(ComponentStatus status, int level, ComponentCategory category, boolean allowsChildren,
                        List<String> allowedChildTypes, List<PropDescriptor> propsSchema, List<String> events,
                        Map<String, TargetSupport> supportedTargets) {
        this.status = status;
        this.level = level;
        this.category = category;
        this.allowsChildren = allowsChildren;
        this.allowedChildTypes = allowedChildTypes == null ? List.of() : allowedChildTypes;
        this.propsSchema = propsSchema == null ? List.of() : propsSchema;
        this.events = events == null ? List.of() : events;
        this.supportedTargets = validateTargetMap(supportedTargets == null ? Map.of() : supportedTargets);
        this.updatedAt = OffsetDateTime.now();
    }

    /** Regra de compatibilidade 8 do catálogo: uma tela não pode publicar componente REMOVED. Não
     * apaga a linha (telas já publicadas antes da remoção continuam referenciando o type+version). */
    public void markRemoved() {
        this.status = ComponentStatus.REMOVED;
        this.updatedAt = OffsetDateTime.now();
    }

    private static Map<String, TargetSupport> validateTargetMap(Map<String, TargetSupport> targets) {
        for (String key : targets.keySet()) {
            if (!RenderTarget.ALL.contains(key)) {
                throw new UnknownRenderTargetException(key);
            }
        }
        return targets;
    }

    /** Chave de negócio composta (type+version) usada pra indexar um mapa do Registry em memória —
     * ex.: validação de embeddedScreenRoot em FlowValidator, sem bater no banco por nó de tela. */
    public String key() {
        return type + "@" + version;
    }

    public UUID getId() {
        return id;
    }

    public String getType() {
        return type;
    }

    public String getVersion() {
        return version;
    }

    public ComponentStatus getStatus() {
        return status;
    }

    public int getLevel() {
        return level;
    }

    public ComponentCategory getCategory() {
        return category;
    }

    public boolean isAllowsChildren() {
        return allowsChildren;
    }

    public List<String> getAllowedChildTypes() {
        return allowedChildTypes;
    }

    public List<PropDescriptor> getPropsSchema() {
        return propsSchema;
    }

    public List<String> getEvents() {
        return events;
    }

    public Map<String, TargetSupport> getSupportedTargets() {
        return supportedTargets;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
