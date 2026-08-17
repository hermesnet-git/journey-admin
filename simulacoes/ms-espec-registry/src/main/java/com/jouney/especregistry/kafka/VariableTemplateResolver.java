package com.jouney.especregistry.kafka;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

/**
 * Resolve {@code {{name}}} contra variáveis de processo — mesmo algoritmo do
 * {@code ConnectorTestAdapter.resolve/resolveDeep} do admin/back (não dá pra importar entre
 * módulos Maven, só portar). O {@code BpmnTransformer} não resolve variáveis pra conector Kafka
 * (só pro HTTP Connector nativo), então o token chega cru no external task — é este worker quem
 * resolve, na hora de publicar de verdade.
 */
@Component
public class VariableTemplateResolver {

    private static final Pattern VARIABLE_TOKEN = Pattern.compile("\\{\\{\\s*([A-Za-z_][A-Za-z0-9_]*)\\s*\\}\\}");

    public String resolve(String template, Map<String, String> vars) {
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
    public Object resolveDeep(Object value, Map<String, String> vars) {
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
}
