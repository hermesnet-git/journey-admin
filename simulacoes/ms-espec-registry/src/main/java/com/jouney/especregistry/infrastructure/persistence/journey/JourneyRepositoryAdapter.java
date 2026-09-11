package com.jouney.especregistry.infrastructure.persistence.journey;

import com.jouney.especregistry.domain.journey.JourneyRepository;
import com.jouney.especregistry.domain.journey.PublicationSnapshot;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
public class JourneyRepositoryAdapter implements JourneyRepository {

    private final PublicationJpaRepository publicationJpaRepository;
    private final JourneyVersionJpaRepository versionJpaRepository;
    private final ObjectMapper objectMapper;

    public JourneyRepositoryAdapter(PublicationJpaRepository publicationJpaRepository,
                                     JourneyVersionJpaRepository versionJpaRepository, ObjectMapper objectMapper) {
        this.publicationJpaRepository = publicationJpaRepository;
        this.versionJpaRepository = versionJpaRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    public Optional<PublicationSnapshot> findPublication(UUID journeyId) {
        return publicationJpaRepository.findByJourneyId(journeyId).map(e -> readJson(e.getSnapshot()));
    }

    @Override
    public Optional<PublicationSnapshot> findVersion(UUID journeyId, UUID versionId) {
        return versionJpaRepository.findById(versionId)
                .filter(e -> e.getJourneyId().equals(journeyId))
                .map(e -> readJson(e.getSnapshot()));
    }

    @Override
    public Optional<PublicationSnapshot> findVersion(UUID journeyId, int versionNumber) {
        return versionJpaRepository.findByJourneyIdAndVersionNumber(journeyId, versionNumber)
                .map(e -> readJson(e.getSnapshot()));
    }

    private PublicationSnapshot readJson(String json) {
        try {
            return objectMapper.readValue(json, PublicationSnapshot.class);
        } catch (Exception e) {
            throw new IllegalStateException("Falha ao desserializar snapshot de jornada", e);
        }
    }
}
