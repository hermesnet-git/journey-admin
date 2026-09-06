package com.jouney.especregistry.simulation;

import java.util.List;

/** O canal declarado ao iniciar uma instância (?channel=...) não está entre os tipos de canal que
 * a jornada publicada de fato atende. */
public class UnsupportedChannelException extends RuntimeException {

    private final String channel;
    private final List<String> supportedChannelTypes;

    public UnsupportedChannelException(String channel, List<String> supportedChannelTypes) {
        super("Canal '" + channel + "' não suportado por esta jornada — canais suportados: " + supportedChannelTypes);
        this.channel = channel;
        this.supportedChannelTypes = supportedChannelTypes;
    }

    public String channel() {
        return channel;
    }

    public List<String> supportedChannelTypes() {
        return supportedChannelTypes;
    }
}
