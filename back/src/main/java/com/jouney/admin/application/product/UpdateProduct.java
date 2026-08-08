package com.jouney.admin.application.product;

import com.jouney.admin.application.audit.RecordAuditEvent;
import com.jouney.admin.domain.audit.AuditResult;
import com.jouney.admin.domain.product.Product;
import com.jouney.admin.domain.product.ProductNotFoundException;
import com.jouney.admin.domain.product.ProductRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class UpdateProduct {

    private final ProductRepository productRepository;
    private final RecordAuditEvent recordAuditEvent;

    public UpdateProduct(ProductRepository productRepository, RecordAuditEvent recordAuditEvent) {
        this.productRepository = productRepository;
        this.recordAuditEvent = recordAuditEvent;
    }

    public Product execute(UUID id, String name, String description) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ProductNotFoundException(id));

        product.update(name, description);
        Product saved = productRepository.save(product);
        recordAuditEvent.record("PRODUCT_UPDATE", "PRODUCT", id, AuditResult.SUCCESS);
        return saved;
    }
}
