package com.jouney.admin.application.product;

import com.jouney.admin.application.audit.RecordAuditEvent;
import com.jouney.admin.domain.audit.AuditResult;
import com.jouney.admin.domain.channel.ChannelType;
import com.jouney.admin.domain.product.Product;
import com.jouney.admin.domain.product.ProductRepository;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class CreateProduct {

    private final ProductRepository productRepository;
    private final RecordAuditEvent recordAuditEvent;

    public CreateProduct(ProductRepository productRepository, RecordAuditEvent recordAuditEvent) {
        this.productRepository = productRepository;
        this.recordAuditEvent = recordAuditEvent;
    }

    public Product execute(String name, String description, Set<ChannelType> channelTypes) {
        Product product = productRepository.save(Product.create(name, description, channelTypes));
        recordAuditEvent.record("PRODUCT_CREATE", "PRODUCT", product.getId(), AuditResult.SUCCESS);
        return product;
    }
}
