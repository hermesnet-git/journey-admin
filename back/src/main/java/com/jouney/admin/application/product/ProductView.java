package com.jouney.admin.application.product;

import com.jouney.admin.domain.channel.ChannelType;
import com.jouney.admin.domain.product.Product;
import java.util.List;

public record ProductView(Product product, List<ChannelType> channelTypes) {
}
