package com.jouney.admin.application.product;

import com.jouney.admin.application.ActivePublicationPort;
import com.jouney.admin.domain.ActivePublicationExistsException;
import com.jouney.admin.domain.product.Product;
import com.jouney.admin.domain.product.ProductNotFoundException;
import com.jouney.admin.domain.product.ProductRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class DeactivateProduct {

    private final ProductRepository productRepository;
    private final ActivePublicationPort activePublicationPort;

    public DeactivateProduct(ProductRepository productRepository, ActivePublicationPort activePublicationPort) {
        this.productRepository = productRepository;
        this.activePublicationPort = activePublicationPort;
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
    }
}
