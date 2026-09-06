package com.jouney.admin.application.journey;

import com.jouney.admin.domain.journey.Journey;
import com.jouney.admin.domain.product.Product;
import com.jouney.admin.domain.product.ProductNotFoundException;
import com.jouney.admin.domain.product.ProductRepository;
import com.jouney.admin.domain.publication.Publication;
import com.jouney.admin.domain.publication.PublicationRepository;
import com.jouney.admin.domain.version.JourneyVersion;
import com.jouney.admin.domain.version.JourneyVersionRepository;
import com.jouney.admin.domain.version.VersionStatus;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
class JourneyViewAssembler {

    private final ProductRepository productRepository;
    private final PublicationRepository publicationRepository;
    private final JourneyVersionRepository journeyVersionRepository;

    JourneyViewAssembler(ProductRepository productRepository, PublicationRepository publicationRepository,
                          JourneyVersionRepository journeyVersionRepository) {
        this.productRepository = productRepository;
        this.publicationRepository = publicationRepository;
        this.journeyVersionRepository = journeyVersionRepository;
    }

    JourneyView assemble(Journey journey) {
        Product product = productRepository.findById(journey.getProductId())
                .orElseThrow(() -> new ProductNotFoundException(journey.getProductId()));
        var publishedAt = publicationRepository.findByJourneyId(journey.getId())
                .map(Publication::getPublishedAt)
                .orElse(null);
        var publishedVersion = journeyVersionRepository.findByJourneyIdAndStatus(journey.getId(), VersionStatus.PUBLISHED)
                .orElse(null);
        var publishedVersionId = publishedVersion != null ? publishedVersion.getId() : null;
        var publishedVersionNumber = publishedVersion != null ? publishedVersion.getVersionNumber() : null;
        return new JourneyView(journey, product.getId(), product.getName(), List.copyOf(journey.getChannelTypes()),
                publishedAt, publishedVersionId, publishedVersionNumber);
    }
}
