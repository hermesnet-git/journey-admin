package com.jouney.admin.interfaces.product;

import com.jouney.admin.application.channel.ChannelView;
import com.jouney.admin.application.channel.CreateChannel;
import com.jouney.admin.application.channel.FindChannelsByProduct;
import com.jouney.admin.application.product.ActivateProduct;
import com.jouney.admin.application.product.CreateProduct;
import com.jouney.admin.application.product.DeactivateProduct;
import com.jouney.admin.application.product.FindProducts;
import com.jouney.admin.application.product.GetProduct;
import com.jouney.admin.application.product.UpdateProduct;
import com.jouney.admin.domain.Status;
import com.jouney.admin.domain.channel.ChannelType;
import com.jouney.admin.interfaces.channel.ChannelInput;
import com.jouney.admin.interfaces.channel.ChannelResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/products")
public class ProductController {

    private final CreateProduct createProduct;
    private final UpdateProduct updateProduct;
    private final GetProduct getProduct;
    private final FindProducts findProducts;
    private final DeactivateProduct deactivateProduct;
    private final ActivateProduct activateProduct;
    private final CreateChannel createChannel;
    private final FindChannelsByProduct findChannelsByProduct;

    public ProductController(CreateProduct createProduct, UpdateProduct updateProduct, GetProduct getProduct,
                              FindProducts findProducts, DeactivateProduct deactivateProduct,
                              ActivateProduct activateProduct,
                              CreateChannel createChannel, FindChannelsByProduct findChannelsByProduct) {
        this.createProduct = createProduct;
        this.updateProduct = updateProduct;
        this.getProduct = getProduct;
        this.findProducts = findProducts;
        this.deactivateProduct = deactivateProduct;
        this.activateProduct = activateProduct;
        this.createChannel = createChannel;
        this.findChannelsByProduct = findChannelsByProduct;
    }

    @GetMapping
    public List<ProductResponse> list(@RequestParam(required = false) String q,
                                       @RequestParam(required = false) Status status) {
        return findProducts.execute(q, status).stream().map(ProductResponse::from).toList();
    }

    @PostMapping
    public ResponseEntity<ProductResponse> create(@Valid @RequestBody ProductInput input) {
        var product = createProduct.execute(input.name(), input.description());
        return ResponseEntity.status(HttpStatus.CREATED).body(ProductResponse.from(getProduct.execute(product.getId())));
    }

    @GetMapping("/{productId}")
    public ProductResponse get(@PathVariable UUID productId) {
        return ProductResponse.from(getProduct.execute(productId));
    }

    @PutMapping("/{productId}")
    public ProductResponse update(@PathVariable UUID productId, @Valid @RequestBody ProductInput input) {
        updateProduct.execute(productId, input.name(), input.description());
        return ProductResponse.from(getProduct.execute(productId));
    }

    @PostMapping("/{productId}/deactivate")
    public ResponseEntity<Void> deactivate(@PathVariable UUID productId) {
        deactivateProduct.execute(productId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{productId}/activate")
    public ResponseEntity<Void> activate(@PathVariable UUID productId) {
        activateProduct.execute(productId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{productId}/channels")
    public List<ChannelResponse> listChannels(@PathVariable UUID productId,
                                               @RequestParam(required = false) String q,
                                               @RequestParam(required = false) ChannelType type,
                                               @RequestParam(required = false) Status status) {
        return findChannelsByProduct.execute(productId, q, type, status).stream().map(ChannelResponse::from).toList();
    }

    @PostMapping("/{productId}/channels")
    public ResponseEntity<ChannelResponse> createChannel(@PathVariable UUID productId,
                                                           @Valid @RequestBody ChannelInput input) {
        var channel = createChannel.execute(productId, input.name(), input.description(), input.type());
        return ResponseEntity.status(HttpStatus.CREATED).body(ChannelResponse.from(new ChannelView(channel, 0)));
    }
}
