package com.jouney.admin.domain.figma;

/** Resultado da leitura profunda de um trecho: o que ele vira se for importado.
 * {@code incompleteDecisions} são as decisões com menos de dois caminhos desenhados — o fluxo
 * exige pelo menos dois, então essas dependem do usuário pra fechar no editor. */
public record FigmaScopeAnalysis(String nodeId, String name, int screens, int distinctScreens,
                                  int decisions, int incompleteDecisions, int screenWidth) {
}
