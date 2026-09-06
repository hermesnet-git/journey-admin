package com.jouney.especregistry.sdui;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/** Valida toda `events.*.action` de uma árvore SDUI contra as 6 ações do catálogo (seção 9) antes
 * de servir a tela pro canal — uma tela publicada com ação fora do whitelist nunca chega ao usuário
 * final. ponytail: não valida allowlist de URL/params de action.openUrl (não existe config de
 * allowlist neste projeto) — gap deliberado, documentado. */
public final class ActionRegistry {

    private static final Set<String> VALID_ACTIONS = Set.of("action.submit", "action.navigate",
            "action.openUrl", "action.setValue", "action.track", "action.dismiss");

    private ActionRegistry() {
    }

    public static void validate(SduiNode root) {
        List<String> violations = new ArrayList<>();
        walk(root, violations);
        if (!violations.isEmpty()) {
            throw new SduiActionValidationException(violations);
        }
    }

    private static void walk(SduiNode node, List<String> violations) {
        if (node.events() != null) {
            node.events().forEach((eventName, event) -> {
                if (event.action() == null || !VALID_ACTIONS.contains(event.action())) {
                    violations.add("Componente '" + node.id() + "' evento '" + eventName + "' com ação inválida: '"
                            + event.action() + "'");
                }
            });
        }
        if (node.children() != null) {
            node.children().forEach(child -> walk(child, violations));
        }
    }
}
