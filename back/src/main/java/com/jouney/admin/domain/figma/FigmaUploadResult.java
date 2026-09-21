package com.jouney.admin.domain.figma;

import java.util.List;

/** Leitura de um arquivo enviado. Diferente da leitura pelo Figma, aqui a árvore inteira já está
 * em mãos, então cada trecho já vem contado — não há segunda ida ao servidor para saber no que
 * cada um dá. */
public record FigmaUploadResult(FigmaOutline outline, List<FigmaScopeAnalysis> scopes) {
}
