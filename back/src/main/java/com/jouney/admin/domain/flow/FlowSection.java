package com.jouney.admin.domain.flow;

import java.util.List;

/** Seção do canvas: um nome para um grupo de etapas, que o editor pode recolher. Só apresentação —
 * como as anotações, nunca chega à validação, à publicação nem ao motor. */
public record FlowSection(String id, String name, List<String> nodeIds) {
}
