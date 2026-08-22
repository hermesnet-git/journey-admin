package com.jouney.admin.infrastructure.persistence.journey;

import com.jouney.admin.application.JourneyCountPort;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class JourneyCountAdapter implements JourneyCountPort {

    private final JourneyJpaRepository jpaRepository;

    public JourneyCountAdapter(JourneyJpaRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public long countByChannelId(UUID channelId) {
        return jpaRepository.countByChannelId(channelId);
    }
}
