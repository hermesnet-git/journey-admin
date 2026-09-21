package com.jouney.admin.domain.figma;

import com.jouney.admin.domain.flow.FlowConnection;
import com.jouney.admin.domain.flow.FlowNode;
import java.util.List;

/** Fluxo montado a partir de um desenho, pronto para ser revisado no editor. Nasce como rascunho e
 * pode conter pontas soltas de propósito: o que o desenho não diz não é adivinhado aqui. */
public record FigmaBuiltFlow(String name, List<FlowNode> nodes, List<FlowConnection> connections,
                              int unlinkedSteps) {
}
