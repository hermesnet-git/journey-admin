package com.jouney.admin.application.channel;

import com.jouney.admin.application.audit.RecordAuditEvent;
import com.jouney.admin.domain.audit.AuditResult;
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
    private final RecordAuditEvent recordAuditEvent;

    public CreateChannel(ChannelRepository channelRepository, ProductRepository productRepository,
                          RecordAuditEvent recordAuditEvent) {
        this.channelRepository = channelRepository;
        this.productRepository = productRepository;
        this.recordAuditEvent = recordAuditEvent;
    }

    public Channel execute(UUID productId, String name, String description, ChannelType type) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ProductNotFoundException(productId));

        if (!product.isActive()) {
            throw new ProductInactiveException(productId);
        }

        Channel channel = channelRepository.save(Channel.create(productId, name, description, type));
        recordAuditEvent.record("CHANNEL_CREATE", "CHANNEL", channel.getId(), AuditResult.SUCCESS);
        return channel;
    }
}
