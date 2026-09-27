package com.jouney.especregistry.infrastructure.persistence.screen;

import com.jouney.especregistry.domain.screen.ScreenEnvelope;
import com.jouney.especregistry.domain.screen.SnapshotRepository;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** Implementação da porta {@link SnapshotRepository} sobre o schema espec_registry: cada publicação
 * vira uma nova revisão e a anterior da mesma tela passa a {@code deprecated} — um snapshot
 * publicado nunca é editado. */
@Component
public class PostgresSnapshotRepository implements SnapshotRepository {

    private final PublishedScreenJpaRepository jpaRepository;
    private final ObjectMapper objectMapper;

    public PostgresSnapshotRepository(PublishedScreenJpaRepository jpaRepository, ObjectMapper objectMapper) {
        this.jpaRepository = jpaRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional
    public void save(ScreenEnvelope envelope) {
        jpaRepository.deprecatePublished(envelope.journeyId(), envelope.journeyVersion(), envelope.uiStepId());
        jpaRepository.save(new PublishedScreenJpaEntity(envelope.journeyId(), envelope.journeyVersion(),
                envelope.uiStepId(), integrityHash(envelope.data()),
                envelope.publishedAt() != null ? envelope.publishedAt() : OffsetDateTime.now(),
                objectMapper.writeValueAsString(envelope)));
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ScreenEnvelope> findPublished(UUID journeyId, int journeyVersion, String uiStepId) {
        return jpaRepository.findPublished(journeyId, journeyVersion, uiStepId)
                .map(e -> objectMapper.readValue(e.getEnvelope(), ScreenEnvelope.class));
    }

    // Consulta mínima por chave inexistente — só prova que o schema responde pro healthcheck do admin/back.
    @Override
    public boolean isReachable() {
        try {
            jpaRepository.existsById(new UUID(0L, 0L));
            return true;
        } catch (DataAccessException e) {
            return false;
        }
    }

    private String integrityHash(JsonNode data) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(objectMapper.writeValueAsBytes(data));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("Falha ao calcular hash de integridade da tela publicada", e);
        }
    }
}
