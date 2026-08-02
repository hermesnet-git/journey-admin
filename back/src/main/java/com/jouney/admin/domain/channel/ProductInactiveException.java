package com.jouney.admin.domain.channel;

import java.util.UUID;

public class ProductInactiveException extends RuntimeException {

    public ProductInactiveException(UUID productId) {
        super("Product is inactive: " + productId);
    }
}
