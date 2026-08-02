package com.jouney.admin.application.journey;

import com.jouney.admin.domain.Status;
import com.jouney.admin.domain.channel.Channel;
import com.jouney.admin.domain.channel.ChannelNotFoundException;
import com.jouney.admin.domain.channel.ChannelRepository;
import com.jouney.admin.domain.channel.ProductInactiveException;
import com.jouney.admin.domain.flow.Flow;
import com.jouney.admin.domain.flow.FlowRepository;
import com.jouney.admin.domain.journey.ChannelInactiveException;
import com.jouney.admin.domain.journey.Journey;
import com.jouney.admin.domain.journey.JourneyRepository;
import com.jouney.admin.domain.product.Product;
import com.jouney.admin.domain.product.ProductNotFoundException;
import com.jouney.admin.domain.product.ProductRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class CreateJourney {

    private final JourneyRepository journeyRepository;
    private final ChannelRepository channelRepository;
    private final ProductRepository productRepository;
    private final FlowRepository flowRepository;

    public CreateJourney(JourneyRepository journeyRepository, ChannelRepository channelRepository,
                          ProductRepository productRepository, FlowRepository flowRepository) {
        this.journeyRepository = journeyRepository;
        this.channelRepository = channelRepository;
        this.productRepository = productRepository;
        this.flowRepository = flowRepository;
    }

    public Journey execute(UUID channelId, String name, String description) {
        Channel channel = channelRepository.findById(channelId)
                .orElseThrow(() -> new ChannelNotFoundException(channelId));

        if (channel.getStatus() != Status.ACTIVE) {
            throw new ChannelInactiveException(channelId);
        }

        Product product = productRepository.findById(channel.getProductId())
                .orElseThrow(() -> new ProductNotFoundException(channel.getProductId()));

        if (!product.isActive()) {
            throw new ProductInactiveException(product.getId());
        }

        Journey journey = journeyRepository.save(Journey.create(channelId, name, description));
        flowRepository.save(Flow.initial(journey.getId()));
        return journey;
    }
}
