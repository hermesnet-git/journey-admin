package com.jouney.admin.application.channel;

import com.jouney.admin.domain.channel.Channel;

public record ChannelView(Channel channel, long journeyCount) {
}
