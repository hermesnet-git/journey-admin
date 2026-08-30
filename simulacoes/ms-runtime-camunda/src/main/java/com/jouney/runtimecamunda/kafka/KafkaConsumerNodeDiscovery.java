package com.jouney.runtimecamunda.kafka;

import java.util.ArrayList;
import java.util.List;
import org.camunda.bpm.engine.RepositoryService;
import org.camunda.bpm.engine.repository.ProcessDefinition;
import org.camunda.bpm.model.bpmn.BpmnModelInstance;
import org.camunda.bpm.model.bpmn.instance.BaseElement;
import org.camunda.bpm.model.bpmn.instance.MessageEventDefinition;
import org.camunda.bpm.model.bpmn.instance.ReceiveTask;
import org.camunda.bpm.model.bpmn.instance.StartEvent;
import org.springframework.stereotype.Component;

/**
 * Varre os processos implantados (última versão, ativos) em busca de RECEIVE_TASK/MESSAGE_START_EVENT
 * com conector Kafka — direto no BPMN via a API do próprio engine embutido, sem chamar admin/back
 * nem ms-espec-registry: o motor descobre sozinho os tópicos que precisa escutar.
 */
@Component
public class KafkaConsumerNodeDiscovery {

    private final RepositoryService repositoryService;

    public KafkaConsumerNodeDiscovery(RepositoryService repositoryService) {
        this.repositoryService = repositoryService;
    }

    public List<ConsumerNode> discover() {
        List<ConsumerNode> result = new ArrayList<>();
        for (ProcessDefinition definition : repositoryService.createProcessDefinitionQuery().active().latestVersion().list()) {
            BpmnModelInstance model = repositoryService.getBpmnModelInstance(definition.getId());
            for (ReceiveTask task : model.getModelElementsByType(ReceiveTask.class)) {
                addIfKafka(result, definition.getKey(), task, "RECEIVE_TASK");
            }
            for (StartEvent event : model.getModelElementsByType(StartEvent.class)) {
                boolean isMessageStart = event.getEventDefinitions().stream().anyMatch(MessageEventDefinition.class::isInstance);
                if (isMessageStart) {
                    addIfKafka(result, definition.getKey(), event, "MESSAGE_START_EVENT");
                }
            }
        }
        return result;
    }

    private void addIfKafka(List<ConsumerNode> result, String processDefinitionKey, BaseElement element, String nodeType) {
        String connectorType = BpmnConnectorElements.inputParameter(element, "connectorType").orElse(null);
        if (!"KAFKA".equalsIgnoreCase(connectorType)) {
            return;
        }
        String topic = BpmnConnectorElements.inputParameter(element, "topic").orElse(null);
        if (topic == null || topic.isBlank()) {
            return;
        }
        result.add(new ConsumerNode(processDefinitionKey, element.getId(), nodeType, topic,
                BpmnConnectorElements.outputMapping(element)));
    }
}
