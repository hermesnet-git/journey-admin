package com.jouney.admin.interfaces.flow;

import com.jouney.admin.domain.sdui.SduiNode;
import java.util.List;
import java.util.Map;

// embeddedScreenRoot é a raiz da árvore SDUI (catálogo corporativo v1) desenhada no editor
// embutido do dock — sempre um único ui.screen, null quando não há tela.
// dataSources: fontes de dados de referência que a tela usa (ADR-002) — [{alias, source, params,
// required, errorMessage}].
public record UserTaskConfigInput(SduiNode embeddedScreenRoot, List<Map<String, Object>> dataSources) {
}
