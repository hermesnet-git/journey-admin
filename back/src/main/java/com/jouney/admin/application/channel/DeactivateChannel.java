package com.jouney.admin.application.channel;

import com.jouney.admin.application.ActivePublicationPort;
import com.jouney.admin.domain.ActivePublicationExistsException;
import com.jouney.admin.domain.channel.Channel;
import com.jouney.admin.domain.channel.ChannelNotFoundException;
import com.jouney.admin.domain.channel.ChannelRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class DeactivateChannel {

    private final ChannelRepository channelRepository;
    private final ActivePublicationPort activePublicationPort;

    public DeactivateChannel(ChannelRepository channelRepository, ActivePublicationPort activePublicationPort) {
        this.channelRepository = channelRepository;
        this.activePublicationPort = activePublicationPort;
    }

    public void execute(UUID id) {
        Channel channel = channelRepository.findById(id)
                .orElseThrow(() -> new ChannelNotFoundException(id));

        if (activePublicationPort.existsForChannel(id)) {
            throw new ActivePublicationExistsException(
                    "Cannot deactivate channel with an active journey publication: " + id);
        }

        channel.deactivate();
        channelRepository.save(channel);
    }
}
