package com.jouney.runtimecamunda.kafka;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.camunda.bpm.model.bpmn.instance.BaseElement;
import org.camunda.bpm.model.bpmn.instance.ExtensionElements;
import org.camunda.bpm.model.bpmn.instance.camunda.CamundaInputOutput;
import org.camunda.bpm.model.bpmn.instance.camunda.CamundaInputParameter;
import org.camunda.bpm.model.xml.instance.ModelElementInstance;

/** Lê de volta, direto do modelo BPMN implantado, os camunda:inputParameter que o BpmnTransformer
 * (ms-transform-publication) gravou pro conector de um nó — mesma convenção de nomes dos dois lados,
 * só que aqui é leitura, não escrita (ver BpmnTransformer.attachConnectorConfig). */
final class BpmnConnectorElements {

    private static final String OUTPUT_MAPPING_PREFIX = "outputMapping.";
    private static final String TYPE_SUFFIX = ".type";

    private BpmnConnectorElements() {
    }

    static Optional<String> inputParameter(BaseElement element, String name) {
        return inputParameters(element).stream()
                .filter(p -> name.equals(p.getCamundaName()))
                .map(CamundaInputParameter::getTextContent)
                .findFirst();
    }

    static List<OutputMappingRule> outputMapping(BaseElement element) {
        Map<String, String> jsonPaths = new LinkedHashMap<>();
        Map<String, String> types = new LinkedHashMap<>();
        for (CamundaInputParameter param : inputParameters(element)) {
            String name = param.getCamundaName();
            if (name == null || !name.startsWith(OUTPUT_MAPPING_PREFIX)) {
                continue;
            }
            String rest = name.substring(OUTPUT_MAPPING_PREFIX.length());
            if (rest.endsWith(TYPE_SUFFIX)) {
                types.put(rest.substring(0, rest.length() - TYPE_SUFFIX.length()), param.getTextContent());
            } else {
                jsonPaths.put(rest, param.getTextContent());
            }
        }
        List<OutputMappingRule> rules = new ArrayList<>();
        jsonPaths.forEach((ruleName, jsonPath) ->
                rules.add(new OutputMappingRule(ruleName, jsonPath, types.getOrDefault(ruleName, "string"))));
        return rules;
    }

    private static List<CamundaInputParameter> inputParameters(BaseElement element) {
        ExtensionElements extensionElements = element.getExtensionElements();
        if (extensionElements == null) {
            return List.of();
        }
        List<CamundaInputParameter> result = new ArrayList<>();
        for (ModelElementInstance child : extensionElements.getElements()) {
            if (child instanceof CamundaInputOutput inputOutput) {
                result.addAll(inputOutput.getCamundaInputParameters());
            }
        }
        return result;
    }
}
