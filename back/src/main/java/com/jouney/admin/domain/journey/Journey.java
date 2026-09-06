package com.jouney.admin.domain.journey;

import com.jouney.admin.domain.channel.ChannelType;
import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

public class Journey {

    private final UUID id;
    private final UUID productId;
    private Set<ChannelType> channelTypes;
    private String name;
    private String description;
    private JourneyStatus status;
    private final OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public Journey(UUID id, UUID productId, Set<ChannelType> channelTypes, String name, String description,
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

    public static Journey create(UUID productId, Set<ChannelType> channelTypes, String name, String description) {
        requireNonEmpty(channelTypes);
        OffsetDateTime now = OffsetDateTime.now();
        return new Journey(UUID.randomUUID(), productId, channelTypes, name, description, JourneyStatus.DRAFT, now, now);
    }

    public void update(String name, String description) {
        this.name = name;
        this.description = description;
        this.updatedAt = OffsetDateTime.now();
    }

    // A jornada agora pode atender vários tipos de canal do mesmo produto — nunca fica sem
    // nenhum (requireNonEmpty), senão não haveria como ela ser executada por canal algum.
    public void updateChannels(Set<ChannelType> channelTypes) {
        requireNonEmpty(channelTypes);
        this.channelTypes = new LinkedHashSet<>(channelTypes);
        this.updatedAt = OffsetDateTime.now();
    }

    private static void requireNonEmpty(Set<ChannelType> channelTypes) {
        if (channelTypes == null || channelTypes.isEmpty()) {
            throw new JourneyChannelsEmptyException();
        }
    }

    public void deactivate() {
        this.status = JourneyStatus.INACTIVE;
        this.updatedAt = OffsetDateTime.now();
    }

    public void publish() {
        this.status = JourneyStatus.PUBLISHED;
        this.updatedAt = OffsetDateTime.now();
    }

    public void unpublish() {
        this.status = JourneyStatus.UNPUBLISHED;
        this.updatedAt = OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getProductId() {
        return productId;
    }

    public Set<ChannelType> getChannelTypes() {
        return Set.copyOf(channelTypes);
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
