package com.jouney.runtimecamunda.kafka;

import java.util.List;

/** Uma regra {name, jsonPath, type} de outputMapping, reconstruída a partir dos camunda:inputParameter
 * "outputMapping.&lt;name&gt;"/"outputMapping.&lt;name&gt;.type" gravados pelo BpmnTransformer
 * (ms-transform-publication) no BPMN implantado. {@code keepFields} só vale pro tipo "list"
 * ("outputMapping.&lt;name&gt;.keepFields", separado por vírgula). */
public record OutputMappingRule(String name, String jsonPath, String type, List<String> keepFields) {
}
