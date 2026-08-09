package com.jouney.admin.infrastructure.persistence.version;

import com.jouney.admin.domain.flow.FlowConnection;
import com.jouney.admin.domain.flow.FlowNode;
import com.jouney.admin.domain.form.Form;
import com.jouney.admin.domain.form.FormField;
import com.jouney.admin.domain.version.JourneyVersion;
import com.jouney.admin.domain.version.JourneyVersionRepository;
import com.jouney.admin.domain.version.VersionStatus;
import com.jouney.admin.infrastructure.persistence.flow.FlowConnectionRecord;
import com.jouney.admin.infrastructure.persistence.flow.FlowNodeRecord;
import com.jouney.admin.infrastructure.persistence.form.FormFieldRecord;
import com.jouney.admin.infrastructure.persistence.publication.PublicationSnapshotRecord;
import com.jouney.admin.infrastructure.persistence.publication.SnapshotFormRecord;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

/**
 * Persists a {@link JourneyVersion}'s content as a JSONB snapshot, reusing the same on-wire shape
 * as {@code journey_publication} ({@link PublicationSnapshotRecord}) since both represent the same
 * "journey + product + channel + flow + forms" bundle at a point in time.
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
                version.getProductName(), version.getChannelId(), version.getChannelName(), version.getChannelType(),
                version.getFlowNodes().stream()
                        .map(n -> new FlowNodeRecord(n.getId(), n.getType(), n.getName(), n.getDescription(),
                                n.getPositionX(), n.getPositionY(), n.getFormId(),
                                FlowNodeRecord.ConnectorConfigRecord.from(n.getConnectorConfig())))
                        .toList(),
                version.getFlowConnections().stream()
                        .map(c -> new FlowConnectionRecord(c.getId(), c.getSourceNodeId(), c.getTargetNodeId()))
                        .toList(),
                version.getForms().stream()
                        .map(f -> new SnapshotFormRecord(f.getId(), f.getName(), f.getDescription(),
                                f.getFields().stream()
                                        .map(field -> new FormFieldRecord(field.getId(), field.getType(),
                                                field.getLabel(), field.isRequired(), field.getDefaultValue(),
                                                field.getHelpText(), field.getOptions()))
                                        .toList()))
                        .toList());

        JourneyVersionJpaEntity entity = new JourneyVersionJpaEntity(version.getId(), version.getJourneyId(),
                version.getVersionNumber(), version.getStatus(), writeJson(record), version.getDescription(),
                version.getCreatedBy(), version.getCreatedAt(), version.getPublishedAt());
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
    public int findMaxVersionNumber(UUID journeyId) {
        return jpaRepository.findMaxVersionNumber(journeyId);
    }

    @Override
    public void deleteById(UUID versionId) {
        jpaRepository.deleteById(versionId);
    }

    private JourneyVersion toDomain(JourneyVersionJpaEntity entity) {
        PublicationSnapshotRecord record = readJson(entity.getSnapshot());

        List<FlowNode> flowNodes = record.flowNodes().stream()
                .map(n -> new FlowNode(n.id(), n.type(), n.name(), n.description(), n.positionX(), n.positionY(),
                        n.formId(), n.connectorConfig() != null ? n.connectorConfig().toDomain() : null))
                .toList();
        List<FlowConnection> flowConnections = record.flowConnections().stream()
                .map(c -> new FlowConnection(c.id(), c.sourceNodeId(), c.targetNodeId()))
                .toList();
        List<Form> forms = record.forms().stream()
                .map(f -> new Form(f.id(), f.name(), f.description(),
                        f.fields().stream()
                                .map(field -> new FormField(field.id(), field.type(), field.label(), field.required(),
                                        field.defaultValue(), field.helpText(), field.options()))
                                .toList(),
                        entity.getCreatedAt(), entity.getCreatedAt()))
                .toList();

        return new JourneyVersion(entity.getId(), entity.getJourneyId(), entity.getVersionNumber(),
                entity.getStatus(), entity.getDescription(), entity.getCreatedBy(), entity.getCreatedAt(),
                entity.getPublishedAt(), record.journeyName(), record.journeyDescription(), record.productId(),
                record.productName(), record.channelId(), record.channelName(), record.channelType(), flowNodes,
                flowConnections, forms);
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
