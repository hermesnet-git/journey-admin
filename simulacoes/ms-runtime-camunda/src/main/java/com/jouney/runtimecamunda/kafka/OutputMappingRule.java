package com.jouney.runtimecamunda.kafka;

/** Uma regra {name, jsonPath, type} de outputMapping, reconstruída a partir dos camunda:inputParameter
 * "outputMapping.&lt;name&gt;"/"outputMapping.&lt;name&gt;.type" gravados pelo BpmnTransformer
 * (ms-transform-publication) no BPMN implantado. */
public record OutputMappingRule(String name, String jsonPath, String type) {
}
