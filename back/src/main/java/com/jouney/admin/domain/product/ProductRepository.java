package com.jouney.admin.domain.product;

import com.jouney.admin.domain.Status;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProductRepository {

    Product save(Product product);

    Optional<Product> findById(UUID id);

    List<Product> search(String query, Status status);
}
