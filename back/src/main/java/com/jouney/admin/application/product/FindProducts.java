package com.jouney.admin.application.product;

import com.jouney.admin.domain.Status;
import com.jouney.admin.domain.product.ProductRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class FindProducts {

    private final ProductRepository productRepository;

    public FindProducts(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    public List<ProductView> execute(String query, Status status) {
        return productRepository.search(query, status).stream()
                .map(product -> new ProductView(product, List.copyOf(product.getChannelTypes())))
                .toList();
    }
}
