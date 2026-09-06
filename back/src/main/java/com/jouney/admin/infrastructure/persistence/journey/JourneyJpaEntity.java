package com.jouney.admin.infrastructure.persistence.journey;

import com.jouney.admin.domain.channel.ChannelType;
import com.jouney.admin.domain.journey.JourneyStatus;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "journey")
public class JourneyJpaEntity {

    @Id
    @Column(name = "journey_id")
    private UUID id;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    // EAGER de propósito: coleção pequena (poucos canais por jornada), sempre lida junto do
    // agregado (toDomain roda fora de qualquer sessão aberta, então LAZY — o padrão do JPA pra
    // @ElementCollection — estoura LazyInitializationException ao montar JourneyResponse).
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "journey_channel_type", joinColumns = @JoinColumn(name = "journey_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "channel_type")
    private Set<ChannelType> channelTypes = new LinkedHashSet<>();

    @Column(nullable = false)
    private String name;

    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private JourneyStatus status;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected JourneyJpaEntity() {
    }

    public JourneyJpaEntity(UUID id, UUID productId, Set<ChannelType> channelTypes, String name, String description,
                             JourneyStatus status, OffsetDateTime createdAt, OffsetDateTime updatedAt) {
        this.id = id;
        this.productId = productId;
        this.channelTypes = new LinkedHashSet<>(channelTypes);
        this.name = name;
        this.description = description;
        this.status = status;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public UUID getId() {
        return id;
    }

    public UUID getProductId() {
        return productId;
    }

    public Set<ChannelType> getChannelTypes() {
        return channelTypes;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public JourneyStatus getStatus() {
        return status;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
