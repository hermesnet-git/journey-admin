package com.jouney.especregistry.sdui;

import com.jouney.especregistry.camunda.CamundaVariable;
import java.util.Map;

/**
 * Resolve um path de binding ({@code namespace.resto}, seção 8 do catálogo) contra as variáveis de
 * processo do Camunda (form/data) ou o {@link ResolutionContext} (session/route). `computed` nunca
 * resolve — o catálogo proíbe execução arbitrária de expressão pra valor computado (seção 8,
 * "não executar JavaScript, Dart, expressões de template ou código arbitrário"), e este projeto não
 * tem motor de regras pra isso.
 *
 * Convenção deste projeto (variáveis de processo são flat, sem objeto aninhado): TUDO depois do
 * primeiro ponto é o nome da variável, mesmo que contenha outro ponto — não há resolução de
 * caminho aninhado tipo {@code data.customer.name}, mesma simplificação já assumida em
 * FlowValidator.java (admin/back).
 */
public final class SduiBindingResolver {

    private SduiBindingResolver() {
    }

    public static Object resolve(String path, Map<String, CamundaVariable> processVariables, ResolutionContext ctx) {
        if (path == null) {
            return null;
        }
        int dot = path.indexOf('.');
        if (dot < 0) {
            return null;
        }
        String namespace = path.substring(0, dot);
        String rest = path.substring(dot + 1);
        return switch (namespace) {
            case "form", "data" -> {
                CamundaVariable variable = processVariables.get(rest);
                yield variable != null ? variable.value() : null;
            }
            case "session" -> ctx.session().get(rest);
            case "route" -> ctx.route().get(rest);
            default -> null; // "computed" e qualquer namespace desconhecido
        };
    }
}
