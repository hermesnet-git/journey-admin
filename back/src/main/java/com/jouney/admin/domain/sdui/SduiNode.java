package com.jouney.admin.domain.sdui;

import java.util.List;
import java.util.Map;

/**
 * Nó da árvore de tela SDUI corporativa (catálogo v1, seção 6) — {@code {id,type,version,props,
 * bindings,events,visibility,children}}. Domínio e wire format são o mesmo record imutável, sem um
 * mirror de persistência separado: é dado puro (sem invariante/comportamento a encapsular), mesmo
 * princípio já usado por {@code ConnectorConfig.getConfig()} (Map livre serializado direto).
 */
public record SduiNode(String id, String type, String version, Map<String, Object> props,
                        Map<String, SduiBinding> bindings, Map<String, SduiEvent> events,
                        SduiVisibility visibility, List<SduiNode> children) {
}
