package com.jouney.admin.infrastructure.messaging;

import com.jouney.admin.application.messaging.MessagingReferenceInUsePort;
import com.jouney.admin.domain.flow.ConnectorConfig;
import com.jouney.admin.domain.flow.FlowNode;
import com.jouney.admin.domain.journey.Journey;
import com.jouney.admin.domain.journey.JourneyRepository;
import com.jouney.admin.domain.journey.JourneyStatus;
import com.jouney.admin.domain.publication.PublicationRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Predicate;
import org.springframework.stereotype.Component;

/**
 * Varre o snapshot publicado das jornadas com publicação ativa procurando um conector que
 * referencie o cluster/credencial em questão (REQ-14.01.004/REQ-14.02.005). Mesmo estilo de
 * varredura de {@link com.jouney.admin.infrastructure.publication.JourneyPublicationStatusAdapter}
 * — ação administrativa rara, não um caminho quente, então N+1 aqui é aceitável.
 */
@Component
public class FlowConnectorReferenceAdapter implements MessagingReferenceInUsePort {

    private final JourneyRepository journeyRepository;
    private final PublicationRepository publicationRepository;

    public FlowConnectorReferenceAdapter(JourneyRepository journeyRepository,
                                          PublicationRepository publicationRepository) {
        this.journeyRepository = journeyRepository;
        this.publicationRepository = publicationRepository;
    }

    @Override
    public Optional<String> findPublishedJourneyNameReferencingCluster(UUID clusterId) {
        return findPublishedJourneyMatching(config -> config.getConfig() != null
                && clusterId.toString().equals(String.valueOf(config.getConfig().get("clusterId"))));
    }

    @Override
    public Optional<String> findPublishedJourneyNameReferencingCredential(String credentialReferenceName) {
        return findPublishedJourneyMatching(config -> credentialReferenceName.equals(config.getCredentialRef()));
    }

    private Optional<String> findPublishedJourneyMatching(Predicate<ConnectorConfig> predicate) {
        List<Journey> publishedJourneys = journeyRepository.search(null, null, null, JourneyStatus.PUBLISHED, null);
        for (Journey journey : publishedJourneys) {
            boolean matches = publicationRepository.findByJourneyId(journey.getId())
                    .map(publication -> publication.getFlowNodes().stream()
                            .map(FlowNode::getConnectorConfig)
                            .filter(config -> config != null)
                            .anyMatch(predicate))
                    .orElse(false);
            if (matches) {
                return Optional.of(journey.getName());
            }
        }
        return Optional.empty();
    }
}
