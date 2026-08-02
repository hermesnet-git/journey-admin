package com.jouney.admin.application.product;

import com.jouney.admin.domain.Status;
import com.jouney.admin.domain.channel.Channel;
import com.jouney.admin.domain.channel.ChannelRepository;
import com.jouney.admin.domain.product.ProductRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class FindProducts {

    private final ProductRepository productRepository;
    private final ChannelRepository channelRepository;

    public FindProducts(ProductRepository productRepository, ChannelRepository channelRepository) {
        this.productRepository = productRepository;
        this.channelRepository = channelRepository;
    }

    public List<ProductView> execute(String query, Status status) {
        return productRepository.search(query, status).stream()
                .map(product -> {
                    var channelNames = channelRepository.search(product.getId(), null, null, null).stream()
                            .map(Channel::getName)
                            .toList();
                    return new ProductView(product, channelNames);
                })
                .toList();
    }
}
