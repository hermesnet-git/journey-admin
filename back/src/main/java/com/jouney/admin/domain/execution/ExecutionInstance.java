package com.jouney.admin.domain.execution;

import com.jouney.admin.domain.channel.ChannelType;
import com.jouney.admin.domain.flow.FlowConnection;
import com.jouney.admin.domain.flow.FlowNode;
import java.util.List;

/** Resultado de iniciar uma instância: o diagrama da jornada (nós, conexões, canais) — da
 * publicação ativa, ou de uma versão publicada específica escolhida pelo usuário (REQ-05.07.007)
 * — e o primeiro passo a mostrar. */
public record ExecutionInstance(String processInstanceId, String businessKey, List<ChannelType> channelTypes,
                                 List<FlowNode> flowNodes, List<FlowConnection> flowConnections, ExecutionStep step,
                                 boolean manualKafkaControl) {
}
