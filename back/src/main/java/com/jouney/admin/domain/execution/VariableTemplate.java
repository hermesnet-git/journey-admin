package com.jouney.admin.domain.execution;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Resolve {@code {{name}}} contra variáveis de processo — mesmo algoritmo usado em conector REST
 * (teste ad-hoc) e no worker Kafka do {@code ms-runtime-camunda}; portado aqui, não compartilhado
 * entre módulos Maven (mesma situação já documentada nos outros dois). */
public final class VariableTemplate {

    private static final Pattern VARIABLE_TOKEN = Pattern.compile("\\{\\{\\s*([A-Za-z_][A-Za-z0-9_]*)\\s*\\}\\}");

    private VariableTemplate() {
    }

    public static String resolve(String template, Map<String, String> vars) {
        if (template == null) {
            return null;
        }
        Matcher matcher = VARIABLE_TOKEN.matcher(template);
        StringBuilder result = new StringBuilder();
        while (matcher.find()) {
            matcher.appendReplacement(result, Matcher.quoteReplacement(vars.getOrDefault(matcher.group(1), "")));
        }
        matcher.appendTail(result);
        return result.toString();
    }

    @SuppressWarnings("unchecked")
    public static Object resolveDeep(Object value, Map<String, String> vars) {
        if (value instanceof String s) {
            return resolve(s, vars);
        }
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> result = new LinkedHashMap<>();
            map.forEach((k, v) -> result.put(String.valueOf(k), resolveDeep(v, vars)));
            return result;
        }
        if (value instanceof List<?> list) {
            return list.stream().map(v -> resolveDeep(v, vars)).toList();
        }
        return value;
    }

    public static Map<String, String> stringify(Map<String, Object> variables) {
        Map<String, String> result = new LinkedHashMap<>();
        variables.forEach((name, value) -> result.put(name, value != null ? String.valueOf(value) : ""));
        return result;
    }
}
