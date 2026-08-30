package com.jouney.runtimecamunda.kafka;

import java.util.List;

/** Um RECEIVE_TASK/MESSAGE_START_EVENT com conector Kafka, descoberto direto no BPMN implantado
 * (nunca chama admin/back nem ms-espec-registry — o motor lê seus próprios processos). */
public record ConsumerNode(String processDefinitionKey, String nodeId, String nodeType, String topic,
                            List<OutputMappingRule> outputMapping) {
}
