package com.jouney.admin.domain.channel;

import com.jouney.admin.domain.Status;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChannelRepository {

    Channel save(Channel channel);

    Optional<Channel> findById(UUID id);

    List<Channel> search(UUID productId, String query, ChannelType type, Status status);
}
