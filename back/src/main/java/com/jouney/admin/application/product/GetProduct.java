package com.jouney.admin.application.product;

import com.jouney.admin.domain.channel.Channel;
import com.jouney.admin.domain.channel.ChannelRepository;
import com.jouney.admin.domain.product.Product;
import com.jouney.admin.domain.product.ProductNotFoundException;
import com.jouney.admin.domain.product.ProductRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class GetProduct {

    private final ProductRepository productRepository;
    private final ChannelRepository channelRepository;

    public GetProduct(ProductRepository productRepository, ChannelRepository channelRepository) {
        this.productRepository = productRepository;
        this.channelRepository = channelRepository;
    }

    public ProductView execute(UUID id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ProductNotFoundException(id));
        var channelNames = channelRepository.search(id, null, null, null).stream()
                .map(Channel::getName)
                .toList();
        return new ProductView(product, channelNames);
    }
}
