package com.jouney.admin.interfaces.figma;

import com.jouney.admin.domain.figma.FigmaBuiltFlow;
import com.jouney.admin.interfaces.flow.FlowResponse;
import java.util.List;

/** Mesma forma que o editor já recebe de qualquer outra leitura de fluxo, para o canvas carregar o
 * resultado como uma edição não salva. {@code unlinkedSteps} conta as etapas que entraram sem
 * ligação — o desenho não disse o que leva a elas, e isso precisa ficar dito. */
public record FigmaBuildResponse(String name, List<FlowResponse.NodeResponse> nodes,
                                  List<FlowResponse.ConnectionResponse> connections, int unlinkedSteps) {

    public static FigmaBuildResponse from(FigmaBuiltFlow built) {
        return new FigmaBuildResponse(built.name(),
                built.nodes().stream().map(FlowResponse.NodeResponse::from).toList(),
                built.connections().stream().map(FlowResponse.ConnectionResponse::from).toList(),
                built.unlinkedSteps());
    }
}
