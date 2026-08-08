package com.jouney.admin.application.product;

import com.jouney.admin.application.ActivePublicationPort;
import com.jouney.admin.application.audit.RecordAuditEvent;
import com.jouney.admin.domain.ActivePublicationExistsException;
import com.jouney.admin.domain.audit.AuditResult;
import com.jouney.admin.domain.product.Product;
import com.jouney.admin.domain.product.ProductNotFoundException;
import com.jouney.admin.domain.product.ProductRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class DeactivateProduct {

    private final ProductRepository productRepository;
    private final ActivePublicationPort activePublicationPort;
    private final RecordAuditEvent recordAuditEvent;

    public DeactivateProduct(ProductRepository productRepository, ActivePublicationPort activePublicationPort,
                              RecordAuditEvent recordAuditEvent) {
        this.productRepository = productRepository;
        this.activePublicationPort = activePublicationPort;
        this.recordAuditEvent = recordAuditEvent;
    }

    public void execute(UUID id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ProductNotFoundException(id));

        if (activePublicationPort.existsForProduct(id)) {
            throw new ActivePublicationExistsException(
                    "Cannot deactivate product with an active journey publication: " + id);
        }

        product.deactivate();
        productRepository.save(product);
        recordAuditEvent.record("PRODUCT_DEACTIVATE", "PRODUCT", id, AuditResult.SUCCESS);
    }
}
