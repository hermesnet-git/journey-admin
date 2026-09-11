package com.jouney.admin.domain.execution;

import com.jouney.admin.domain.channel.ChannelType;
import com.jouney.admin.domain.flow.FlowConnection;
import com.jouney.admin.domain.flow.FlowNode;
import java.util.List;
import java.util.UUID;

/** Detalhe completo de uma instância no histórico (Diagnóstico): cabeçalho + diagrama da versão
 * que rodou de fato (não necessariamente a versão publicada mais recente — uma instância antiga
 * pode ter rodado numa versão já substituída) + a trilha completa de passos visitados. */
public record ExecutionHistoryDetail(String processInstanceId, String businessKey, UUID journeyId,
                                      String journeyName, Integer versionNumber, String state, String startTime,
                                      String endTime, Long durationMillis, List<ChannelType> channelTypes,
                                      List<FlowNode> flowNodes, List<FlowConnection> flowConnections,
                                      List<HistoryStep> steps) {
}
