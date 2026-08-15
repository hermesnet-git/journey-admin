package com.jouney.admin.infrastructure.persistence.flow;

import com.jouney.admin.domain.flow.Flow;
import com.jouney.admin.domain.flow.FlowConnection;
import com.jouney.admin.domain.flow.FlowNode;
import com.jouney.admin.domain.flow.FlowRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

@Component
public class FlowRepositoryAdapter implements FlowRepository {

    private final FlowJpaRepository jpaRepository;
    private final ObjectMapper objectMapper;

    public FlowRepositoryAdapter(FlowJpaRepository jpaRepository, ObjectMapper objectMapper) {
        this.jpaRepository = jpaRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    public Flow save(Flow flow) {
        String nodesJson = writeJson(flow.getNodes().stream()
                .map(n -> new FlowNodeRecord(n.getId(), n.getType(), n.getName(), n.getDescription(),
                        n.getPositionX(), n.getPositionY(), n.getFormId(),
                        FlowNodeRecord.ConnectorConfigRecord.from(n.getConnectorConfig())))
                .toList());
        String connectionsJson = writeJson(flow.getConnections().stream()
                .map(c -> new FlowConnectionRecord(c.getId(), c.getSourceNodeId(), c.getTargetNodeId(), c.getCondition(),
                        c.isDefault()))
                .toList());
        FlowJpaEntity entity = new FlowJpaEntity(flow.getId(), flow.getJourneyId(), flow.getName(), nodesJson,
                connectionsJson, flow.getCreatedAt(), flow.getUpdatedAt());
        return toDomain(jpaRepository.save(entity));
    }

    @Override
    public Optional<Flow> findByJourneyId(UUID journeyId) {
        return jpaRepository.findByJourneyId(journeyId).map(this::toDomain);
    }

    @Override
    public void deleteByJourneyId(UUID journeyId) {
        jpaRepository.deleteByJourneyId(journeyId);
    }

    private Flow toDomain(FlowJpaEntity entity) {
        List<FlowNodeRecord> nodeRecords = readJson(entity.getNodes(), new TypeReference<List<FlowNodeRecord>>() {
        });
        List<FlowConnectionRecord> connectionRecords = readJson(entity.getConnections(),
                new TypeReference<List<FlowConnectionRecord>>() {
                });
        List<FlowNode> nodes = nodeRecords.stream()
                .map(n -> new FlowNode(n.id(), n.type(), n.name(), n.description(), n.positionX(), n.positionY(),
                        n.formId(), n.connectorConfig() != null ? n.connectorConfig().toDomain() : null))
                .toList();
        List<FlowConnection> connections = connectionRecords.stream()
                .map(c -> new FlowConnection(c.id(), c.sourceNodeId(), c.targetNodeId(), c.condition(), c.isDefaultOrFalse()))
                .toList();
        return new Flow(entity.getId(), entity.getJourneyId(), entity.getName(), nodes, connections,
                entity.getCreatedAt(), entity.getUpdatedAt());
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to serialize flow", e);
        }
    }

    private <T> T readJson(String json, TypeReference<T> type) {
        try {
            return objectMapper.readValue(json, type);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to deserialize flow", e);
        }
    }
}
