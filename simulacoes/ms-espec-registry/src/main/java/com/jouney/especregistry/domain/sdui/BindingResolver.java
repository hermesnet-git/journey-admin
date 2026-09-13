package com.jouney.especregistry.domain.sdui;

import com.jouney.especregistry.domain.engine.EngineVariable;
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
 *
 * `form` e `data` deixaram de compartilhar a mesma variável crua do motor: a variável real do
 * Camunda carrega o namespace no próprio nome ({@code form_nome}, {@code data_pedido} — underscore,
 * não ponto, porque a condição de Gateway vira uma expressão JUEL literal (BpmnTransformer.
 * resolveCondition) e JUEL interpreta ponto como acesso a propriedade). `channel` é a única exceção
 * — injetado sem prefixo por StartExecution/ms-journey antes de qualquer conversão, nunca passa por
 * esta convenção.
 */
public final class BindingResolver {

    private BindingResolver() {
    }

    public static Object resolve(String path, Map<String, EngineVariable> processVariables, ResolutionContext ctx) {
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
                EngineVariable variable = processVariables.get(namespace + "_" + rest);
                yield variable != null ? variable.value() : null;
            }
            case "session" -> ctx.session().get(rest);
            case "route" -> ctx.route().get(rest);
            default -> null; // "computed" e qualquer namespace desconhecido
        };
    }
}
