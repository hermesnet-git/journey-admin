package com.jouney.admin.infrastructure.persistence.version;

import com.jouney.admin.domain.flow.FlowConnection;
import com.jouney.admin.domain.flow.FlowNode;
import com.jouney.admin.domain.version.JourneyVersion;
import com.jouney.admin.domain.version.JourneyVersionRepository;
import com.jouney.admin.domain.version.VersionStatus;
import com.jouney.admin.infrastructure.persistence.flow.FlowConnectionRecord;
import com.jouney.admin.infrastructure.persistence.flow.FlowNodeRecord;
import com.jouney.admin.infrastructure.persistence.publication.PublicationSnapshotRecord;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

/**
 * Persists a {@link JourneyVersion}'s content as a JSONB snapshot, reusing the same on-wire shape
 * as {@code journey_publication} ({@link PublicationSnapshotRecord}) since both represent the same
 * "journey + product + channel + flow" bundle at a point in time.
 */
@Component
public class JourneyVersionRepositoryAdapter implements JourneyVersionRepository {

    private final JourneyVersionJpaRepository jpaRepository;
    private final ObjectMapper objectMapper;

    public JourneyVersionRepositoryAdapter(JourneyVersionJpaRepository jpaRepository, ObjectMapper objectMapper) {
        this.jpaRepository = jpaRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    public JourneyVersion save(JourneyVersion version) {
        PublicationSnapshotRecord record = new PublicationSnapshotRecord(version.getJourneyId(),
                version.getJourneyName(), version.getJourneyDescription(), version.getProductId(),
                version.getProductName(), version.getChannelTypes(), version.getVersionNumber(),
                version.getFlowNodes().stream()
                        .map(n -> new FlowNodeRecord(n.getId(), n.getType(), n.getName(), n.getDescription(),
                                n.getPositionX(), n.getPositionY(),
                                FlowNodeRecord.ConnectorConfigRecord.from(n.getConnectorConfig()),
                                n.getStartVariables(), n.getMessageText(), n.getEmbeddedScreenRoot()))
                        .toList(),
                version.getFlowConnections().stream()
                        .map(c -> new FlowConnectionRecord(c.getId(), c.getSourceNodeId(), c.getTargetNodeId(), c.getCondition(),
                                c.isDefault()))
                        .toList());

        JourneyVersionJpaEntity entity = new JourneyVersionJpaEntity(version.getId(), version.getJourneyId(),
                version.getVersionNumber(), version.getStatus(), writeJson(record), version.getDescription(),
                version.getCreatedBy(), version.getCreatedAt(), version.getPublishedAt(),
                version.getRuntimeDeploymentId());
        return toDomain(jpaRepository.save(entity));
    }

    @Override
    public Optional<JourneyVersion> findById(UUID versionId) {
        return jpaRepository.findById(versionId).map(this::toDomain);
    }

    @Override
    public List<JourneyVersion> findByJourneyId(UUID journeyId) {
        return jpaRepository.findByJourneyIdOrderByVersionNumberDesc(journeyId).stream().map(this::toDomain).toList();
    }

    @Override
    public Optional<JourneyVersion> findByJourneyIdAndStatus(UUID journeyId, VersionStatus status) {
        return jpaRepository.findByJourneyIdAndStatus(journeyId, status).map(this::toDomain);
    }

    @Override
    public List<JourneyVersion> findAllByJourneyIdAndStatus(UUID journeyId, VersionStatus status) {
        return jpaRepository.findAllByJourneyIdAndStatus(journeyId, status).stream().map(this::toDomain).toList();
    }

    @Override
    public int findMaxVersionNumber(UUID journeyId) {
        return jpaRepository.findMaxVersionNumber(journeyId);
    }

    @Override
    public void deleteById(UUID versionId) {
        jpaRepository.deleteById(versionId);
    }

    private JourneyVersion toDomain(JourneyVersionJpaEntity entity) {
        PublicationSnapshotRecord record = readJson(entity.getSnapshot());

        // PublishJourneyVersion usa version.getFlowNodes() pra montar a Publication na hora de
        // (re)publicar — sem repassar embeddedScreenRoot aqui, a tela se perderia nesse republish.
        List<FlowNode> flowNodes = record.flowNodes().stream()
                .map(n -> new FlowNode(n.id(), n.type(), n.name(), n.description(), n.positionX(), n.positionY(),
                        n.connectorConfig() != null ? n.connectorConfig().toDomain() : null,
                        n.startVariables(), n.messageText(), n.embeddedScreenRoot()))
                .toList();
        List<FlowConnection> flowConnections = record.flowConnections().stream()
                .map(c -> new FlowConnection(c.id(), c.sourceNodeId(), c.targetNodeId(), c.condition(), c.isDefaultOrFalse()))
                .toList();

        return new JourneyVersion(entity.getId(), entity.getJourneyId(), entity.getVersionNumber(),
                entity.getStatus(), entity.getDescription(), entity.getCreatedBy(), entity.getCreatedAt(),
                entity.getPublishedAt(), entity.getRuntimeDeploymentId(), record.journeyName(),
                record.journeyDescription(), record.productId(), record.productName(), record.channelTypes(),
                flowNodes, flowConnections);
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to serialize journey version", e);
        }
    }

    private PublicationSnapshotRecord readJson(String json) {
        try {
            return objectMapper.readValue(json, PublicationSnapshotRecord.class);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to deserialize journey version", e);
        }
    }
}
