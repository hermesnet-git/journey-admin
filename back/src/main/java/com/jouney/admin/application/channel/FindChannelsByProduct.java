package com.jouney.admin.application.channel;

import com.jouney.admin.application.JourneyCountPort;
import com.jouney.admin.domain.Status;
import com.jouney.admin.domain.channel.ChannelRepository;
import com.jouney.admin.domain.channel.ChannelType;
import com.jouney.admin.domain.product.ProductNotFoundException;
import com.jouney.admin.domain.product.ProductRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class FindChannelsByProduct {

    private final ChannelRepository channelRepository;
    private final ProductRepository productRepository;
    private final JourneyCountPort journeyCountPort;

    public FindChannelsByProduct(ChannelRepository channelRepository, ProductRepository productRepository,
                                  JourneyCountPort journeyCountPort) {
        this.channelRepository = channelRepository;
        this.productRepository = productRepository;
        this.journeyCountPort = journeyCountPort;
    }

    public List<ChannelView> execute(UUID productId, String query, ChannelType type, Status status) {
        if (productRepository.findById(productId).isEmpty()) {
            throw new ProductNotFoundException(productId);
        }
        return channelRepository.search(productId, query, type, status).stream()
                .map(channel -> new ChannelView(channel, journeyCountPort.countByChannelId(channel.getId())))
                .toList();
    }
}
