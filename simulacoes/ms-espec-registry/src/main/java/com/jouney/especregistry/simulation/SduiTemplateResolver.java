package com.jouney.especregistry.simulation;

import com.jouney.especregistry.adminback.FlowNode;
import com.jouney.especregistry.camunda.CamundaVariable;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Extraído de StepResolver: resolve {{variável}} dentro de uma árvore SDUI ([tag, props,
 * children]) contra um mapa de variáveis já em mãos, sem nenhuma dependência do Camunda/instância
 * em execução — reaproveitado tanto pelo StepResolver (que já tem processInstanceId e busca as
 * variáveis sozinho) quanto pelo FormSpecController (que recebe as variáveis prontas no corpo da
 * requisição, sem noção de instância). */
public final class SduiTemplateResolver {

    private static final Pattern VARIABLE_TOKEN = Pattern.compile("\\{\\{\\s*([A-Za-z_][A-Za-z0-9_]*)\\s*\\}\\}");

    private SduiTemplateResolver() {
    }

    /** Mesma lógica de StepResolver.resolveMessage, mas recebendo o mapa de variáveis já pronto em
     * vez de um processInstanceId — usada pelo FormSpecController, que não conhece instância. */
    public static String resolveMessage(FlowNode node, Map<String, CamundaVariable> variables) {
        String text = node.messageText();
        if (text == null || text.isBlank()) {
            return node.name();
        }
        return resolveTemplate(text, variables);
    }

    @SuppressWarnings("unchecked")
    public static List<Object> resolveSduiNode(List<Object> node, Map<String, CamundaVariable> variables) {
        String tag = (String) node.get(0);
        Map<String, Object> props = (Map<String, Object>) node.get(1);
        List<Object> children = (List<Object>) node.get(2);

        Map<String, Object> resolvedProps = new LinkedHashMap<>();
        props.forEach((key, value) -> resolvedProps.put(key, resolveSduiValue(value, variables)));

        List<Object> resolvedChildren = new ArrayList<>();
        for (Object child : children) {
            resolvedChildren.add(resolveSduiNode((List<Object>) child, variables));
        }
        return List.of(tag, resolvedProps, resolvedChildren);
    }

    @SuppressWarnings("unchecked")
    private static Object resolveSduiValue(Object value, Map<String, CamundaVariable> variables) {
        if (value instanceof String s) {
            return resolveTemplate(s, variables);
        }
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> resolved = new LinkedHashMap<>();
            map.forEach((k, v) -> resolved.put(String.valueOf(k), resolveSduiValue(v, variables)));
            return resolved;
        }
        if (value instanceof List<?> list) {
            List<Object> resolved = new ArrayList<>();
            for (Object item : list) {
                resolved.add(resolveSduiValue(item, variables));
            }
            return resolved;
        }
        return value;
    }

    public static String resolveTemplate(String text, Map<String, CamundaVariable> variables) {
        Matcher matcher = VARIABLE_TOKEN.matcher(text);
        if (!matcher.find()) {
            return text;
        }
        StringBuilder result = new StringBuilder();
        do {
            CamundaVariable variable = variables.get(matcher.group(1));
            String value = variable != null && variable.value() != null ? String.valueOf(variable.value()) : "";
            matcher.appendReplacement(result, Matcher.quoteReplacement(value));
        } while (matcher.find());
        matcher.appendTail(result);
        return result.toString();
    }

    public static List<Object> messageSdui(String message) {
        List<Object> textNode = new ArrayList<>(3);
        textNode.add("ui.text");
        textNode.add(Map.of("text", message));
        textNode.add(List.of());

        List<Object> form = new ArrayList<>(3);
        form.add("ui.form");
        form.add(Map.of());
        form.add(List.of(textNode));
        return form;
    }
}
