package com.jouney.admin.infrastructure.persistence.product;

import com.jouney.admin.domain.Status;
import com.jouney.admin.domain.channel.ChannelType;
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
@Table(name = "product")
public class ProductJpaEntity {

    @Id
    @Column(name = "product_id")
    private UUID id;

    @Column(nullable = false)
    private String name;

    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    // EAGER de propósito, mesmo motivo de JourneyJpaEntity.channelTypes: coleção pequena, sempre
    // lida junto do agregado, fora de qualquer sessão aberta na hora de montar a resposta.
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "product_channel_type", joinColumns = @JoinColumn(name = "product_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "channel_type")
    private Set<ChannelType> channelTypes = new LinkedHashSet<>();

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected ProductJpaEntity() {
    }

    public ProductJpaEntity(UUID id, String name, String description, Status status, Set<ChannelType> channelTypes,
                             OffsetDateTime createdAt, OffsetDateTime updatedAt) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.status = status;
        this.channelTypes = new LinkedHashSet<>(channelTypes);
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public Status getStatus() {
        return status;
    }

    public Set<ChannelType> getChannelTypes() {
        return channelTypes;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
