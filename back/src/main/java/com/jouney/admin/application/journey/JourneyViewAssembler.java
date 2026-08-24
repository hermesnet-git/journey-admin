package com.jouney.admin.application.journey;

import com.jouney.admin.domain.channel.Channel;
import com.jouney.admin.domain.channel.ChannelNotFoundException;
import com.jouney.admin.domain.channel.ChannelRepository;
import com.jouney.admin.domain.journey.Journey;
import com.jouney.admin.domain.product.Product;
import com.jouney.admin.domain.product.ProductNotFoundException;
import com.jouney.admin.domain.product.ProductRepository;
import com.jouney.admin.domain.publication.Publication;
import com.jouney.admin.domain.publication.PublicationRepository;
import com.jouney.admin.domain.version.JourneyVersion;
import com.jouney.admin.domain.version.JourneyVersionRepository;
import com.jouney.admin.domain.version.VersionStatus;
import org.springframework.stereotype.Component;

@Component
class JourneyViewAssembler {

    private final ChannelRepository channelRepository;
    private final ProductRepository productRepository;
    private final PublicationRepository publicationRepository;
    private final JourneyVersionRepository journeyVersionRepository;

    JourneyViewAssembler(ChannelRepository channelRepository, ProductRepository productRepository,
                          PublicationRepository publicationRepository,
                          JourneyVersionRepository journeyVersionRepository) {
        this.channelRepository = channelRepository;
        this.productRepository = productRepository;
        this.publicationRepository = publicationRepository;
        this.journeyVersionRepository = journeyVersionRepository;
    }

    JourneyView assemble(Journey journey) {
        Channel channel = channelRepository.findById(journey.getChannelId())
                .orElseThrow(() -> new ChannelNotFoundException(journey.getChannelId()));
        Product product = productRepository.findById(channel.getProductId())
                .orElseThrow(() -> new ProductNotFoundException(channel.getProductId()));
        var publishedAt = publicationRepository.findByJourneyId(journey.getId())
                .map(Publication::getPublishedAt)
                .orElse(null);
        var publishedVersion = journeyVersionRepository.findByJourneyIdAndStatus(journey.getId(), VersionStatus.PUBLISHED)
                .orElse(null);
        var publishedVersionId = publishedVersion != null ? publishedVersion.getId() : null;
        var publishedVersionNumber = publishedVersion != null ? publishedVersion.getVersionNumber() : null;
        return new JourneyView(journey, product.getId(), product.getName(), channel.getName(), channel.getType(),
                publishedAt, publishedVersionId, publishedVersionNumber);
    }
}
