package com.jouney.especregistry.simulation;

import com.jouney.especregistry.adminback.FlowNode;
import com.jouney.especregistry.camunda.CamundaVariable;
import com.jouney.especregistry.sdui.ResolutionContext;
import com.jouney.especregistry.sdui.SduiBindingResolver;
import com.jouney.especregistry.sdui.SduiEvent;
import com.jouney.especregistry.sdui.SduiNode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Resolve `{{namespace.path}}` (interpolação somente-leitura em texto, seção 8) e o binding
 * `value` (pré-preenchimento) de uma árvore SDUI objeto — sucessor do resolver de tupla
 * [tag,props,children]. Reaproveitado tanto pelo StepResolver (que já tem processInstanceId)
 * quanto pelo FormSpecController (que recebe as variáveis prontas no corpo da requisição).
 *
 * Filosofia mantida do resolver anterior: back resolve, front só renderiza — o valor do binding
 * `value` é escrito em `props.value` (chave sintética, fora do propsSchema autorado), assim o
 * front (SduiNodeRenderer.tsx) não precisa entender bindings, só ler o valor já pronto. */
public final class SduiTemplateResolver {

    // Token com namespace (form.nome) ou legado sem namespace ({{nome}}, ainda usado por messageText
    // de USER_TASK — sintaxe REQ-03.09.012, não faz parte do binding namespace-aware do catálogo SDUI).
    private static final Pattern PLACEHOLDER = Pattern.compile("\\{\\{\\s*([A-Za-z_][\\w.]*)\\s*\\}\\}");

    private SduiTemplateResolver() {
    }

    public static String resolveMessage(FlowNode node, Map<String, CamundaVariable> variables) {
        String text = node.messageText();
        if (text == null || text.isBlank()) {
            return node.name();
        }
        return resolveTemplate(text, variables, ResolutionContext.fromProcessVariables(variables));
    }

    public static SduiNode resolveSduiNode(SduiNode node, Map<String, CamundaVariable> variables, ResolutionContext ctx) {
        Map<String, Object> resolvedProps = new LinkedHashMap<>();
        if (node.props() != null) {
            node.props().forEach((key, value) -> resolvedProps.put(key, resolveValue(value, variables, ctx)));
        }
        if (node.bindings() != null && node.bindings().get("value") != null) {
            Object resolved = SduiBindingResolver.resolve(node.bindings().get("value").path(), variables, ctx);
            if (resolved != null) {
                resolvedProps.put("value", resolved);
            }
        }
        List<SduiNode> resolvedChildren = node.children() == null ? null
                : node.children().stream().map(child -> resolveSduiNode(child, variables, ctx)).toList();
        return new SduiNode(node.id(), node.type(), node.version(), resolvedProps, node.bindings(), node.events(),
                node.visibility(), resolvedChildren);
    }

    @SuppressWarnings("unchecked")
    private static Object resolveValue(Object value, Map<String, CamundaVariable> variables, ResolutionContext ctx) {
        if (value instanceof String s) {
            return resolveTemplate(s, variables, ctx);
        }
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> resolved = new LinkedHashMap<>();
            map.forEach((k, v) -> resolved.put(String.valueOf(k), resolveValue(v, variables, ctx)));
            return resolved;
        }
        if (value instanceof List<?> list) {
            List<Object> resolved = new ArrayList<>();
            for (Object item : list) {
                resolved.add(resolveValue(item, variables, ctx));
            }
            return resolved;
        }
        return value;
    }

    public static String resolveTemplate(String text, Map<String, CamundaVariable> variables, ResolutionContext ctx) {
        Matcher matcher = PLACEHOLDER.matcher(text);
        if (!matcher.find()) {
            return text;
        }
        StringBuilder result = new StringBuilder();
        do {
            String token = matcher.group(1);
            Object resolved = token.indexOf('.') >= 0
                    ? SduiBindingResolver.resolve(token, variables, ctx)
                    : legacyLookup(token, variables);
            String replacement = resolved != null ? String.valueOf(resolved) : "";
            matcher.appendReplacement(result, Matcher.quoteReplacement(replacement));
        } while (matcher.find());
        matcher.appendTail(result);
        return result.toString();
    }

    // {{nome}} sem namespace — sintaxe legada de messageText (REQ-03.09.012), continua batendo
    // direto no nome da variável Camunda, sem passar por SduiBindingResolver.
    private static String legacyLookup(String name, Map<String, CamundaVariable> variables) {
        CamundaVariable variable = variables.get(name);
        return variable != null && variable.value() != null ? String.valueOf(variable.value()) : "";
    }

    /** Sintetiza a menor tela SDUI válida pra uma USER_TASK sem tela desenhada (REQ-04.01.005): um
     * texto com a mensagem e um botão "Avançar" com ação action.submit — equivalente ao antigo
     * "ui.form com ui.text + botão implícito", mas agora o botão precisa estar na árvore de verdade
     * (o catálogo não tem mais submit implícito de framework). */
    public static SduiNode messageSdui(String message) {
        SduiNode text = new SduiNode("message-text", "ui.text", "1.0", Map.of("text", message), null, null, null, List.of());
        SduiNode button = new SduiNode("message-continue", "ui.button", "1.0",
                Map.of("label", "Avançar", "variant", "primary"), null,
                Map.of("onPress", new SduiEvent("action.submit", Map.of())), null, List.of());
        return new SduiNode("message-screen", "ui.screen", "1.0", Map.of(), null, null, null, List.of(text, button));
    }
}
