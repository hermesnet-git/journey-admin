package com.jouney.especregistry.kafka;

import com.jouney.especregistry.adminback.AdminBackClient;
import com.jouney.especregistry.adminback.ConnectorConfig;
import com.jouney.especregistry.adminback.FlowNode;
import com.jouney.especregistry.adminback.JourneySummary;
import com.jouney.especregistry.adminback.PublicationSnapshot;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;

/**
 * Varre todas as jornadas publicadas em busca de nós Kafka — mesma fonte (AdminBackClient) que já
 * alimenta o resto do simulador, nenhum endpoint novo no admin/back foi necessário.
 */
@Component
public class KafkaTopicDiscovery {

    private final AdminBackClient adminBackClient;

    public KafkaTopicDiscovery(AdminBackClient adminBackClient) {
        this.adminBackClient = adminBackClient;
    }

    /** SERVICE_TASK com conector Kafka, indexado pelo nome do external task ("kafka-&lt;nodeId&gt;",
     * mesma convenção usada pelo BpmnTransformer) — o tópico Kafka real de destino fica dentro do
     * próprio connectorConfig, resolvido só na hora de publicar (pode conter {{variável}}). */
    public Map<String, ProducerNode> discoverProducerNodes() {
        Map<String, ProducerNode> result = new LinkedHashMap<>();
        for (JourneySummary journey : adminBackClient.listPublishedJourneys()) {
            PublicationSnapshot snapshot = adminBackClient.getPublicationSnapshot(journey.journeyId());
            for (FlowNode node : snapshot.flowNodes()) {
                if (!"SERVICE_TASK".equals(node.type())) {
                    continue;
                }
                ConnectorConfig connectorConfig = node.connectorConfig();
                if (connectorConfig == null || !"KAFKA".equalsIgnoreCase(connectorConfig.connectorType())) {
                    continue;
                }
                result.put("kafka-" + node.id(), new ProducerNode(node.id(), connectorConfig));
            }
        }
        return result;
    }

    private static final Set<String> CONSUMER_NODE_TYPES = Set.of("RECEIVE_TASK", "MESSAGE_START_EVENT");

    /** RECEIVE_TASK/MESSAGE_START_EVENT com conector Kafka, indexado pelo tópico Kafka **real**
     * (não um tópico sintético de external task — esses nós não passam pelo mecanismo de external
     * task, são correlação de mensagem nativa). Por lista porque mais de uma jornada pode ouvir o
     * mesmo tópico — legitimamente, ou por acaso de duas jornadas reaproveitarem o mesmo id de nó
     * (mesmo template gerador), então nunca dá pra assumir tópico → nó único. */
    public Map<String, List<ConsumerNode>> discoverConsumerNodes() {
        Map<String, List<ConsumerNode>> result = new LinkedHashMap<>();
        for (JourneySummary journey : adminBackClient.listPublishedJourneys()) {
            PublicationSnapshot snapshot = adminBackClient.getPublicationSnapshot(journey.journeyId());
            for (FlowNode node : snapshot.flowNodes()) {
                if (!CONSUMER_NODE_TYPES.contains(node.type())) {
                    continue;
                }
                ConnectorConfig connectorConfig = node.connectorConfig();
                if (connectorConfig == null || !"KAFKA".equalsIgnoreCase(connectorConfig.connectorType())) {
                    continue;
                }
                Object topic = connectorConfig.config() != null ? connectorConfig.config().get("topic") : null;
                if (!(topic instanceof String topicName) || topicName.isBlank()) {
                    continue;
                }
                result.computeIfAbsent(topicName, t -> new ArrayList<>())
                        .add(new ConsumerNode(journey.journeyId(), node.id(), node.type(), connectorConfig));
            }
        }
        return result;
    }
}
