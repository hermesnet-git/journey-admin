package com.jouney.admin.application.figma;

import com.jouney.admin.domain.figma.FigmaFlowBuilder;
import com.jouney.admin.domain.figma.FigmaFlowExtractor;
import com.jouney.admin.domain.figma.FigmaScreenOption;
import com.jouney.admin.domain.flow.FlowIds;
import java.util.List;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;

/** Lista as telas individuais de um trecho, já com a tela SDUI de cada uma pronta — usado pelo
 * editor de tela pra importar uma User Task de cada vez, sem passar pela montagem de um fluxo. */
@Service
public class ListFigmaScreens {

    public List<FigmaScreenOption> execute(JsonNode root) {
        return FigmaFlowExtractor.listScreens(root).stream()
                .map(ref -> {
                    String idPrefix = FlowIds.newNodeId();
                    return new FigmaScreenOption(ref.nodeId(), ref.title(), ref.path(),
                            FigmaFlowBuilder.buildScreenNode(idPrefix, ref.title(), ref.screen()));
                })
                .toList();
    }
}
