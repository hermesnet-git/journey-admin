package com.jouney.admin.application.componentregistry;

import com.jouney.admin.domain.componentregistry.ComponentDefinition;
import com.jouney.admin.domain.componentregistry.ComponentDefinitionRepository;
import com.jouney.admin.domain.componentregistry.ComponentStatus;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

/**
 * Seleciona uma única versão vigente de cada componente para novas telas. Uma versão experimental
 * nunca substitui automaticamente uma versão estável: ela só é oferecida quando o tipo ainda não
 * possui versão estável. Telas existentes continuam resolvidas pela chave exata tipo+versão no
 * catálogo completo.
 */
@Service
public class ListAuthoringComponentDefinitions {

    private final ComponentDefinitionRepository repository;

    public ListAuthoringComponentDefinitions(ComponentDefinitionRepository repository) {
        this.repository = repository;
    }

    public List<ComponentDefinition> execute() {
        Map<String, ComponentDefinition> currentByType = new LinkedHashMap<>();
        repository.findAll().stream()
                .filter(definition -> definition.getStatus() == ComponentStatus.STABLE
                        || definition.getStatus() == ComponentStatus.EXPERIMENTAL)
                .filter(definition -> isSemVer(definition.getVersion()))
                .forEach(definition -> currentByType.merge(definition.getType(), definition,
                        ListAuthoringComponentDefinitions::selectCurrent));
        return currentByType.values().stream()
                .sorted(Comparator.comparingInt(ComponentDefinition::getLevel)
                        .thenComparing(ComponentDefinition::getCategory)
                        .thenComparing(ComponentDefinition::getType))
                .toList();
    }

    private static ComponentDefinition selectCurrent(ComponentDefinition current, ComponentDefinition candidate) {
        if (current.getStatus() != candidate.getStatus()) {
            return candidate.getStatus() == ComponentStatus.STABLE ? candidate : current;
        }
        return compareSemVer(candidate.getVersion(), current.getVersion()) > 0 ? candidate : current;
    }

    private static boolean isSemVer(String version) {
        return version != null && version.matches("^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$");
    }

    private static int compareSemVer(String left, String right) {
        String[] leftParts = left.split("\\.");
        String[] rightParts = right.split("\\.");
        for (int index = 0; index < 3; index++) {
            int comparison = Integer.compare(Integer.parseInt(leftParts[index]), Integer.parseInt(rightParts[index]));
            if (comparison != 0) return comparison;
        }
        return 0;
    }
}
