package com.jouney.admin.interfaces.flow;

import com.jouney.admin.domain.sdui.SduiNode;

// embeddedScreenRoot é a raiz da árvore SDUI (catálogo corporativo v1) desenhada no editor
// embutido do dock — sempre um único ui.screen, null quando não há tela.
public record UserTaskConfigInput(SduiNode embeddedScreenRoot) {
}
