package com.jouney.admin.domain.figma;

import com.jouney.admin.domain.sdui.SduiNode;

/** Uma tela individual pronta para importar dentro do editor — já vem com a árvore SDUI montada,
 * porque a escolha é imediata: o usuário clica e ela substitui a tela em edição. {@code path} é a
 * trilha de seções até ela, usada para agrupar a lista na busca. */
public record FigmaScreenOption(String screenId, String title, String path, SduiNode screen) {
}
