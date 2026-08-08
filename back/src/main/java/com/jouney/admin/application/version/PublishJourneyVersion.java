package com.jouney.admin.application.version;

import com.jouney.admin.application.audit.RecordAuditEvent;
import com.jouney.admin.application.publication.RuntimePublicationPort;
import com.jouney.admin.domain.audit.AuditResult;
import com.jouney.admin.domain.channel.Channel;
import com.jouney.admin.domain.channel.ChannelNotFoundException;
import com.jouney.admin.domain.channel.ChannelRepository;
import com.jouney.admin.domain.channel.ProductInactiveException;
import com.jouney.admin.domain.Status;
import com.jouney.admin.domain.journey.ChannelInactiveException;
import com.jouney.admin.domain.journey.Journey;
import com.jouney.admin.domain.journey.JourneyNotFoundException;
import com.jouney.admin.domain.journey.JourneyRepository;
import com.jouney.admin.domain.product.Product;
import com.jouney.admin.domain.product.ProductNotFoundException;
import com.jouney.admin.domain.product.ProductRepository;
import com.jouney.admin.domain.publication.Publication;
import com.jouney.admin.domain.publication.PublicationRepository;
import com.jouney.admin.domain.version.JourneyVersion;
import com.jouney.admin.domain.version.JourneyVersionNotFoundException;
import com.jouney.admin.domain.version.JourneyVersionRepository;
import com.jouney.admin.domain.version.VersionNotDraftException;
import com.jouney.admin.domain.version.VersionStatus;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Publishes a DRAFT journey version (REQ-06.04): validates channel/product/flow like the legacy
 * {@link com.jouney.admin.application.publication.PublishJourney}, sends the version's own
 * snapshot to the runtime, then archives whichever version was previously PUBLISHED — preserving
 * its snapshot (only its status changes).
 */
@Service
public class PublishJourneyVersion {

    private final JourneyRepository journeyRepository;
    private final ChannelRepository channelRepository;
    private final ProductRepository productRepository;
    private final JourneyVersionRepository journeyVersionRepository;
    private final PublicationRepository publicationRepository;
    private final RuntimePublicationPort runtimePublicationPort;
    private final RecordAuditEvent recordAuditEvent;

    public PublishJourneyVersion(JourneyRepository journeyRepository, ChannelRepository channelRepository,
                                  ProductRepository productRepository,
                                  JourneyVersionRepository journeyVersionRepository,
                                  PublicationRepository publicationRepository,
                                  RuntimePublicationPort runtimePublicationPort, RecordAuditEvent recordAuditEvent) {
        this.journeyRepository = journeyRepository;
        this.channelRepository = channelRepository;
        this.productRepository = productRepository;
        this.journeyVersionRepository = journeyVersionRepository;
        this.publicationRepository = publicationRepository;
        this.runtimePublicationPort = runtimePublicationPort;
        this.recordAuditEvent = recordAuditEvent;
    }

    public JourneyVersion execute(UUID journeyId, UUID versionId) {
        JourneyVersion version = journeyVersionRepository.findById(versionId)
                .filter(v -> v.getJourneyId().equals(journeyId))
                .orElseThrow(() -> new JourneyVersionNotFoundException(versionId));
        if (version.getStatus() != VersionStatus.DRAFT) {
            throw new VersionNotDraftException(versionId);
        }

        Journey journey = journeyRepository.findById(journeyId)
                .orElseThrow(() -> new JourneyNotFoundException(journeyId));

        Channel channel = channelRepository.findById(version.getChannelId())
                .orElseThrow(() -> new ChannelNotFoundException(version.getChannelId()));
        if (channel.getStatus() != Status.ACTIVE) {
            throw new ChannelInactiveException(channel.getId());
        }

        Product product = productRepository.findById(version.getProductId())
                .orElseThrow(() -> new ProductNotFoundException(version.getProductId()));
        if (!product.isActive()) {
            throw new ProductInactiveException(product.getId());
        }

        if (version.getFlowNodes().isEmpty()) {
            throw new IllegalStateException("Journey version has no flow: " + versionId);
        }

        UUID existingPublicationId = publicationRepository.findByJourneyId(journeyId)
                .map(Publication::getId).orElse(null);
        Publication publication = Publication.create(existingPublicationId, journeyId, version.getJourneyName(),
                version.getJourneyDescription(), version.getProductId(), version.getProductName(),
                version.getChannelId(), version.getChannelName(), version.getChannelType(), version.getFlowNodes(),
                version.getFlowConnections(), version.getForms(), version.getId());
        runtimePublicationPort.publish(publication);
        publicationRepository.save(publication);

        journeyVersionRepository.findByJourneyIdAndStatus(journeyId, VersionStatus.PUBLISHED)
                .ifPresent(previous -> {
                    previous.archive();
                    journeyVersionRepository.save(previous);
                });

        version.publish();
        JourneyVersion published = journeyVersionRepository.save(version);

        journey.publish();
        journeyRepository.save(journey);

        recordAuditEvent.record("JOURNEY_VERSION_PUBLISH", "JOURNEY_VERSION", versionId, AuditResult.SUCCESS,
                Map.of("status", "DRAFT"), Map.of("status", "PUBLISHED"));

        return published;
    }
}
