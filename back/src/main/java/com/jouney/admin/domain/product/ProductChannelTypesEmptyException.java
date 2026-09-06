package com.jouney.admin.domain.product;

public class ProductChannelTypesEmptyException extends RuntimeException {

    public ProductChannelTypesEmptyException() {
        super("A product must have at least one channel type");
    }
}
