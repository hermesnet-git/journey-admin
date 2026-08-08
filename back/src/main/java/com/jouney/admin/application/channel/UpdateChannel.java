package com.jouney.admin.application.channel;

import com.jouney.admin.application.audit.RecordAuditEvent;
import com.jouney.admin.domain.audit.AuditResult;
import com.jouney.admin.domain.channel.Channel;
import com.jouney.admin.domain.channel.ChannelNotFoundException;
import com.jouney.admin.domain.channel.ChannelRepository;
import com.jouney.admin.domain.channel.ChannelType;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class UpdateChannel {

    private final ChannelRepository channelRepository;
    private final RecordAuditEvent recordAuditEvent;

    public UpdateChannel(ChannelRepository channelRepository, RecordAuditEvent recordAuditEvent) {
        this.channelRepository = channelRepository;
        this.recordAuditEvent = recordAuditEvent;
    }

    public Channel execute(UUID id, String name, String description, ChannelType type) {
        Channel channel = channelRepository.findById(id)
                .orElseThrow(() -> new ChannelNotFoundException(id));

        channel.update(name, description, type);
        Channel saved = channelRepository.save(channel);
        recordAuditEvent.record("CHANNEL_UPDATE", "CHANNEL", id, AuditResult.SUCCESS);
        return saved;
    }
}
