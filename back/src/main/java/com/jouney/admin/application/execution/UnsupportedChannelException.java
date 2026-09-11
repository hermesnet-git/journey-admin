package com.jouney.admin.application.execution;

import com.jouney.admin.domain.channel.ChannelType;
import java.util.List;

public class UnsupportedChannelException extends RuntimeException {

    public UnsupportedChannelException(String channel, List<ChannelType> supported) {
        super("Canal '" + channel + "' não é atendido por esta jornada (canais habilitados: " + supported + ")");
    }
}
