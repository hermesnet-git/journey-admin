package com.jouney.especregistry.simulation;

import com.jouney.especregistry.adminback.FlowConnection;
import com.jouney.especregistry.adminback.FlowNode;
import com.jouney.especregistry.adminback.PublicationSnapshot;
import java.util.List;

/** Diagrama da jornada (nós, conexões, canal) enviado ao front junto da resposta de início — o
 * workflow só aparece depois de iniciar a execução (REQ-05.07.002), então não há endpoint
 * separado para buscá-lo antes disso. */
public record FlowBundle(String channelType, List<FlowNode> flowNodes, List<FlowConnection> flowConnections) {

    public static FlowBundle from(PublicationSnapshot snapshot) {
        return new FlowBundle(snapshot.channelType(), snapshot.flowNodes(), snapshot.flowConnections());
    }
}
