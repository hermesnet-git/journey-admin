package com.jouney.admin.interfaces.flow;

import com.jouney.admin.domain.sdui.SduiNode;

// messageText só é usado numa USER_TASK sem tela desenhada (REQ-04.01.005) — um passo somente-
// mensagem, sem componente visual. embeddedScreenRoot é a raiz da árvore SDUI (catálogo
// corporativo v1) desenhada no editor embutido do dock — sempre um único ui.screen, null quando
// não há tela.
public record UserTaskConfigInput(String messageText, SduiNode embeddedScreenRoot) {
}
