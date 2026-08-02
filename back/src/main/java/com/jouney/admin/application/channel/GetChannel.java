package com.jouney.admin.application.channel;

import com.jouney.admin.application.JourneyCountPort;
import com.jouney.admin.domain.channel.Channel;
import com.jouney.admin.domain.channel.ChannelNotFoundException;
import com.jouney.admin.domain.channel.ChannelRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class GetChannel {

    private final ChannelRepository channelRepository;
    private final JourneyCountPort journeyCountPort;

    public GetChannel(ChannelRepository channelRepository, JourneyCountPort journeyCountPort) {
        this.channelRepository = channelRepository;
        this.journeyCountPort = journeyCountPort;
    }

    public ChannelView execute(UUID id) {
        Channel channel = channelRepository.findById(id)
                .orElseThrow(() -> new ChannelNotFoundException(id));
        return new ChannelView(channel, journeyCountPort.countByChannelId(id));
    }
}
