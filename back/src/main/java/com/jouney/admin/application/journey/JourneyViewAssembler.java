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
import org.springframework.stereotype.Component;

@Component
class JourneyViewAssembler {

    private final ChannelRepository channelRepository;
    private final ProductRepository productRepository;
    private final PublicationRepository publicationRepository;

    JourneyViewAssembler(ChannelRepository channelRepository, ProductRepository productRepository,
                          PublicationRepository publicationRepository) {
        this.channelRepository = channelRepository;
        this.productRepository = productRepository;
        this.publicationRepository = publicationRepository;
    }

    JourneyView assemble(Journey journey) {
        Channel channel = channelRepository.findById(journey.getChannelId())
                .orElseThrow(() -> new ChannelNotFoundException(journey.getChannelId()));
        Product product = productRepository.findById(channel.getProductId())
                .orElseThrow(() -> new ProductNotFoundException(channel.getProductId()));
        var publishedAt = publicationRepository.findByJourneyId(journey.getId())
                .map(Publication::getPublishedAt)
                .orElse(null);
        return new JourneyView(journey, product.getId(), product.getName(), channel.getName(), publishedAt);
    }
}
