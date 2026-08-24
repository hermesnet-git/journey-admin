package com.jouney.admin.infrastructure.persistence.publication;

import com.jouney.admin.domain.flow.FlowConnection;
import com.jouney.admin.domain.flow.FlowNode;
import com.jouney.admin.domain.publication.Publication;
import com.jouney.admin.domain.publication.PublicationRepository;
import com.jouney.admin.infrastructure.persistence.flow.FlowConnectionRecord;
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
        PublicationSnapshotRecord record = PublicationSnapshotRecord.from(publication);

        PublicationJpaEntity entity = new PublicationJpaEntity(publication.getId(), publication.getJourneyId(),
                writeJson(record), publication.getVersionId(), publication.getPublishedAt(),
                publication.getCreatedAt(), publication.getUpdatedAt());
        return toDomain(jpaRepository.save(entity));
    }

    @Override
    public Optional<Publication> findByJourneyId(UUID journeyId) {
        return jpaRepository.findByJourneyId(journeyId).map(this::toDomain);
    }

    private Publication toDomain(PublicationJpaEntity entity) {
        PublicationSnapshotRecord record = readJson(entity.getSnapshot());

        // O nó reconstruído a partir da snapshot nunca carrega embeddedScreen (só existia na
        // snapshot como a árvore já compilada) — mas carrega embeddedScreenSdui: GetPublicationSnapshot
        // (REQ-02.10.001, inspeção do JSON pela admin UI) monta a resposta rechamando
        // PublicationSnapshotRecord.from(publication) em cima disto, e sem isto aqui a tela sumiria
        // dessa inspeção mesmo já tendo sido publicada corretamente.
        List<FlowNode> flowNodes = record.flowNodes().stream()
                .map(n -> new FlowNode(n.id(), n.type(), n.name(), n.description(), n.positionX(), n.positionY(),
                        n.connectorConfig() != null ? n.connectorConfig().toDomain() : null,
                        n.startVariables(), n.messageText(), List.of(), n.embeddedScreenSdui()))
                .toList();
        List<FlowConnection> flowConnections = record.flowConnections().stream()
                .map(c -> new FlowConnection(c.id(), c.sourceNodeId(), c.targetNodeId(), c.condition(), c.isDefaultOrFalse()))
                .toList();

        return new Publication(entity.getId(), entity.getJourneyId(), record.journeyName(),
                record.journeyDescription(), record.productId(), record.productName(), record.channelId(),
                record.channelName(), record.channelType(), flowNodes, flowConnections,
                entity.getVersionId(), record.versionNumber(), entity.getPublishedAt(), entity.getCreatedAt(),
                entity.getUpdatedAt());
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
