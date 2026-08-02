package com.jouney.admin.application.channel;

import com.jouney.admin.domain.channel.Channel;
import com.jouney.admin.domain.channel.ChannelNotFoundException;
import com.jouney.admin.domain.channel.ChannelRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class ActivateChannel {

    private final ChannelRepository channelRepository;

    public ActivateChannel(ChannelRepository channelRepository) {
        this.channelRepository = channelRepository;
    }

    public void execute(UUID id) {
        Channel channel = channelRepository.findById(id)
                .orElseThrow(() -> new ChannelNotFoundException(id));
        channel.activate();
        channelRepository.save(channel);
    }
}
