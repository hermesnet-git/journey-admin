package com.jouney.admin.infrastructure.persistence.product;

import com.jouney.admin.domain.Status;
import com.jouney.admin.domain.product.Product;
import com.jouney.admin.domain.product.ProductRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;

@Component
public class ProductRepositoryAdapter implements ProductRepository {

    private final ProductJpaRepository jpaRepository;

    public ProductRepositoryAdapter(ProductJpaRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public Product save(Product product) {
        ProductJpaEntity entity = new ProductJpaEntity(product.getId(), product.getName(),
                product.getDescription(), product.getStatus(), product.getCreatedAt(), product.getUpdatedAt());
        return toDomain(jpaRepository.save(entity));
    }

    @Override
    public Optional<Product> findById(UUID id) {
        return jpaRepository.findById(id).map(ProductRepositoryAdapter::toDomain);
    }

    @Override
    public List<Product> search(String query, Status status) {
        Specification<ProductJpaEntity> spec = Specification.allOf();
        if (query != null && !query.isBlank()) {
            String like = "%" + query.toLowerCase() + "%";
            spec = spec.and((root, cq, cb) -> cb.like(cb.lower(root.get("name")), like));
        }
        if (status != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("status"), status));
        }
        return jpaRepository.findAll(spec).stream().map(ProductRepositoryAdapter::toDomain).toList();
    }

    private static Product toDomain(ProductJpaEntity entity) {
        return new Product(entity.getId(), entity.getName(), entity.getDescription(),
                entity.getStatus(), entity.getCreatedAt(), entity.getUpdatedAt());
    }
}
