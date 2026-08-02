package com.jouney.admin.application.channel;

import com.jouney.admin.domain.channel.Channel;
import com.jouney.admin.domain.channel.ChannelNotFoundException;
import com.jouney.admin.domain.channel.ChannelRepository;
import com.jouney.admin.domain.channel.ChannelType;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class UpdateChannel {

    private final ChannelRepository channelRepository;

    public UpdateChannel(ChannelRepository channelRepository) {
        this.channelRepository = channelRepository;
    }

    public Channel execute(UUID id, String name, String description, ChannelType type) {
        Channel channel = channelRepository.findById(id)
                .orElseThrow(() -> new ChannelNotFoundException(id));

        channel.update(name, description, type);
        return channelRepository.save(channel);
    }
}
