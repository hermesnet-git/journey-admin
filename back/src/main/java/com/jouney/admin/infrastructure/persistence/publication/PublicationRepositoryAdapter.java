package com.jouney.admin.infrastructure.persistence.publication;

import com.jouney.admin.domain.flow.FlowConnection;
import com.jouney.admin.domain.flow.FlowNode;
import com.jouney.admin.domain.form.Form;
import com.jouney.admin.domain.form.FormField;
import com.jouney.admin.domain.publication.Publication;
import com.jouney.admin.domain.publication.PublicationRepository;
import com.jouney.admin.infrastructure.persistence.flow.FlowConnectionRecord;
import com.jouney.admin.infrastructure.persistence.flow.FlowNodeRecord;
import com.jouney.admin.infrastructure.persistence.form.FormFieldRecord;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
public class PublicationRepositoryAdapter implements PublicationRepository {

    private final PublicationJpaRepository jpaRepository;
    private final ObjectMapper objectMapper;

    public PublicationRepositoryAdapter(PublicationJpaRepository jpaRepository, ObjectMapper objectMapper) {
        this.jpaRepository = jpaRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    public Publication save(Publication publication) {
        PublicationSnapshotRecord record = new PublicationSnapshotRecord(
                publication.getJourneyId(), publication.getJourneyName(), publication.getJourneyDescription(),
                publication.getProductId(), publication.getProductName(), publication.getChannelId(),
                publication.getChannelName(), publication.getChannelType(),
                publication.getFlowNodes().stream()
                        .map(n -> new FlowNodeRecord(n.getId(), n.getType(), n.getName(), n.getDescription(),
                                n.getPositionX(), n.getPositionY(), n.getFormId()))
                        .toList(),
                publication.getFlowConnections().stream()
                        .map(c -> new FlowConnectionRecord(c.getId(), c.getSourceNodeId(), c.getTargetNodeId()))
                        .toList(),
                publication.getForms().stream()
                        .map(f -> new SnapshotFormRecord(f.getId(), f.getName(), f.getDescription(),
                                f.getFields().stream()
                                        .map(field -> new FormFieldRecord(field.getId(), field.getType(),
                                                field.getLabel(), field.isRequired(), field.getDefaultValue(),
                                                field.getHelpText(), field.getOptions()))
                                        .toList()))
                        .toList());

        PublicationJpaEntity entity = new PublicationJpaEntity(publication.getId(), publication.getJourneyId(),
                writeJson(record), publication.getPublishedAt(), publication.getCreatedAt(),
                publication.getUpdatedAt());
        return toDomain(jpaRepository.save(entity));
    }

    @Override
    public Optional<Publication> findByJourneyId(UUID journeyId) {
        return jpaRepository.findByJourneyId(journeyId).map(this::toDomain);
    }

    private Publication toDomain(PublicationJpaEntity entity) {
        PublicationSnapshotRecord record = readJson(entity.getSnapshot());

        List<FlowNode> flowNodes = record.flowNodes().stream()
                .map(n -> new FlowNode(n.id(), n.type(), n.name(), n.description(), n.positionX(), n.positionY(),
                        n.formId()))
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
                        entity.getCreatedAt(), entity.getUpdatedAt()))
                .toList();

        return new Publication(entity.getId(), entity.getJourneyId(), record.journeyName(),
                record.journeyDescription(), record.productId(), record.productName(), record.channelId(),
                record.channelName(), record.channelType(), flowNodes, flowConnections, forms,
                entity.getPublishedAt(), entity.getCreatedAt(), entity.getUpdatedAt());
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to serialize publication", e);
        }
    }

    private PublicationSnapshotRecord readJson(String json) {
        try {
            return objectMapper.readValue(json, PublicationSnapshotRecord.class);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to deserialize publication", e);
        }
    }
}
