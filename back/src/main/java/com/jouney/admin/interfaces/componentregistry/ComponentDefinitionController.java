package com.jouney.admin.interfaces.componentregistry;

import com.jouney.admin.application.componentregistry.CreateComponentDefinition;
import com.jouney.admin.application.componentregistry.DeleteComponentDefinition;
import com.jouney.admin.application.componentregistry.ListComponentDefinitions;
import com.jouney.admin.application.componentregistry.UpdateComponentDefinition;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Component Registry (seção 12 do catálogo SDUI corporativo v1) — repositório de componentes que o
 * Form Builder pode usar na árvore de tela. Leitura liberada a qualquer role autenticada (a paleta
 * do editor consulta isso); escrita restrita a ADMIN, mesma regra dos outros catálogos.
 */
@RestController
@RequestMapping("/api/v1/component-registry")
public class ComponentDefinitionController {

    private final ListComponentDefinitions listComponentDefinitions;
    private final CreateComponentDefinition createComponentDefinition;
    private final UpdateComponentDefinition updateComponentDefinition;
    private final DeleteComponentDefinition deleteComponentDefinition;

    public ComponentDefinitionController(ListComponentDefinitions listComponentDefinitions,
                                          CreateComponentDefinition createComponentDefinition,
                                          UpdateComponentDefinition updateComponentDefinition,
                                          DeleteComponentDefinition deleteComponentDefinition) {
        this.listComponentDefinitions = listComponentDefinitions;
        this.createComponentDefinition = createComponentDefinition;
        this.updateComponentDefinition = updateComponentDefinition;
        this.deleteComponentDefinition = deleteComponentDefinition;
    }

    @PreAuthorize("hasAnyRole('VIEWER','EDITOR','ADMIN')")
    @GetMapping
    public List<ComponentDefinitionResponse> list() {
        return listComponentDefinitions.execute().stream().map(ComponentDefinitionResponse::from).toList();
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ComponentDefinitionResponse create(@Valid @RequestBody ComponentDefinitionInput input) {
        return ComponentDefinitionResponse.from(createComponentDefinition.execute(input.type(), input.version(),
                input.status(), input.level(), input.category(), input.allowsChildren(), input.allowedChildTypes(),
                input.propsSchema(), input.events(), input.supportedTargets()));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ComponentDefinitionResponse update(@PathVariable UUID id, @Valid @RequestBody ComponentDefinitionInput input) {
        return ComponentDefinitionResponse.from(updateComponentDefinition.execute(id, input.status(), input.level(),
                input.category(), input.allowsChildren(), input.allowedChildTypes(), input.propsSchema(),
                input.events(), input.supportedTargets()));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        deleteComponentDefinition.execute(id);
        return ResponseEntity.noContent().build();
    }
}
