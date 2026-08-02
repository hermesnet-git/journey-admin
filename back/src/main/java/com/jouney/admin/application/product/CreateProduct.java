package com.jouney.admin.application.product;

import com.jouney.admin.domain.product.Product;
import com.jouney.admin.domain.product.ProductRepository;
import org.springframework.stereotype.Service;

@Service
public class CreateProduct {

    private final ProductRepository productRepository;

    public CreateProduct(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    public Product execute(String name, String description) {
        return productRepository.save(Product.create(name, description));
    }
}
