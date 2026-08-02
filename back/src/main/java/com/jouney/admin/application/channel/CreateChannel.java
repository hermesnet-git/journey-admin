package com.jouney.admin.application.channel;

import com.jouney.admin.domain.channel.Channel;
import com.jouney.admin.domain.channel.ChannelRepository;
import com.jouney.admin.domain.channel.ChannelType;
import com.jouney.admin.domain.channel.ProductInactiveException;
import com.jouney.admin.domain.product.Product;
import com.jouney.admin.domain.product.ProductNotFoundException;
import com.jouney.admin.domain.product.ProductRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class CreateChannel {

    private final ChannelRepository channelRepository;
    private final ProductRepository productRepository;

    public CreateChannel(ChannelRepository channelRepository, ProductRepository productRepository) {
        this.channelRepository = channelRepository;
        this.productRepository = productRepository;
    }

    public Channel execute(UUID productId, String name, String description, ChannelType type) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ProductNotFoundException(productId));

        if (!product.isActive()) {
            throw new ProductInactiveException(productId);
        }

        return channelRepository.save(Channel.create(productId, name, description, type));
    }
}
