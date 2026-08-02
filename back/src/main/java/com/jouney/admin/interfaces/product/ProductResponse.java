package com.jouney.admin.interfaces.product;

import com.jouney.admin.application.product.ProductView;
import com.jouney.admin.domain.Status;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record ProductResponse(UUID productId, String name, String description, Status status,
                               List<String> channelNames, OffsetDateTime createdAt, OffsetDateTime updatedAt) {

    public static ProductResponse from(ProductView view) {
        var product = view.product();
        return new ProductResponse(product.getId(), product.getName(), product.getDescription(),
                product.getStatus(), view.channelNames(), product.getCreatedAt(), product.getUpdatedAt());
    }
}
