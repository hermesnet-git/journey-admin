package com.jouney.admin.domain.execution;

import java.util.Map;
import java.util.UUID;

/** Tela de uma User Task já resolvida pelo ms-espec-registry (guardião do contrato SDUI —
 * interpolação e binding oneWay aplicados). {@code sdui} é passthrough opaco: o admin/back nunca
 * interpreta a árvore, só repassa pro front, no mesmo espírito do {@code ms-journey}. */
public record ResolvedForm(UUID id, String name, String description, Object sdui, Map<String, Object> context) {
}
