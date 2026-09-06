package com.jouney.admin.application.componentregistry;

import com.jouney.admin.domain.componentregistry.ComponentDefinition;
import com.jouney.admin.domain.componentregistry.ComponentDefinitionRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ListComponentDefinitions {

    private final ComponentDefinitionRepository repository;

    public ListComponentDefinitions(ComponentDefinitionRepository repository) {
        this.repository = repository;
    }

    public List<ComponentDefinition> execute() {
        return repository.findAll();
    }
}
