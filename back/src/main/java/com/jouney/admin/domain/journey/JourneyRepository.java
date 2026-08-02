package com.jouney.admin.domain.journey;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface JourneyRepository {

    Journey save(Journey journey);

    Optional<Journey> findById(UUID id);

    void deleteById(UUID id);

    List<Journey> search(UUID productId, UUID channelId, String query, JourneySort sort);
}
