package com.jouney.especregistry.interfaces.journey;

import com.jouney.especregistry.domain.journey.FlowConnection;
import com.jouney.especregistry.domain.journey.FlowNode;
import com.jouney.especregistry.domain.journey.PublicationSnapshot;
import java.util.List;

/** Diagrama da jornada (nós, conexões, canal) enviado ao front junto da resposta de início — o
 * workflow só aparece depois de iniciar a execução (REQ-05.07.002), então não há endpoint
 * separado para buscá-lo antes disso. */
public record FlowBundle(List<String> channelTypes, List<FlowNode> flowNodes, List<FlowConnection> flowConnections) {

    public static FlowBundle from(PublicationSnapshot snapshot) {
        return new FlowBundle(snapshot.channelTypes(), snapshot.flowNodes(), snapshot.flowConnections());
    }
}
