package com.jouney.admin.domain.journey;

import com.jouney.admin.domain.channel.ChannelType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface JourneyRepository {

    Journey save(Journey journey);

    Optional<Journey> findById(UUID id);

    void deleteById(UUID id);

    List<Journey> search(UUID productId, ChannelType channelType, String query, JourneyStatus status, JourneySort sort);
}
