package com.jouney.especregistry.domain.screen;

import com.jouney.especregistry.domain.engine.EngineVariable;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * Monta no servidor o que a lista de seleção ({@code ui.selectList}) e as opções vinculadas de um
 * {@code ui.select} entregam ao canal (ADR-002): o canal recebe os itens prontos e nunca vê o array
 * original, os {@code {{item.campo}}} nem as regras "liberada quando" das ações.
 *
 * Forma entregue da lista de seleção: {@code items[{value, title, description?, hint?,
 * enabledActions[]}]}, {@code totalItems}, {@code actions[{id, label, variant}]} e, se a fonte falhou,
 * {@code loadError{message, required}}.
 */
public final class ListMaterializer {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final Pattern ITEM_PLACEHOLDER = Pattern.compile("\\{\\{\\s*item\\.([A-Za-z_][\\w-]*)\\s*\\}\\}");
    private static final Pattern ENABLED_WHEN = Pattern.compile(
            "^\\s*\\{\\{\\s*item\\.([A-Za-z_][\\w-]*)\\s*\\}\\}\\s*(==|!=)\\s*(true|false|-?\\d+(?:\\.\\d+)?|\"[^\"]*\")\\s*$");
    // Atributos de autoria que nunca saem do servidor.
    private static final Set<String> AUTHORING_ONLY = Set.of("itemValue", "itemTitle", "itemDescription", "itemHint",
            "actions", "maxItems");
    private static final int DEFAULT_MAX_ITEMS = 50;

    private ListMaterializer() {
    }

    public static ObjectNode selectList(JsonNode attributes, Map<String, EngineVariable> variables,
                                        Map<String, SourceError> sourceErrors) {
        ObjectNode resolved = MAPPER.createObjectNode();
        attributes.properties().forEach(entry -> {
            String key = entry.getKey();
            JsonNode value = entry.getValue();
            if (AUTHORING_ONLY.contains(key)) {
                return;
            }
            if ("$bindings".equals(key)) {
                resolved.set(key, withoutBinding(value, "items"));
            } else if (value.isTextual() && !key.startsWith("$")) {
                resolved.put(key, TemplateResolver.resolveTemplate(value.asText(), variables));
            } else {
                resolved.set(key, value);
            }
        });
        resolveWritableBindings(attributes, variables, resolved);

        String itemsVariable = BindingResolver.engineVariableName(attributes.path("$bindings").path("items").path("path").asText(null));
        List<JsonNode> all = asList(itemsVariable != null ? variables.get(itemsVariable) : null);
        int max = attributes.path("maxItems").isNumber() ? Math.max(1, attributes.path("maxItems").asInt()) : DEFAULT_MAX_ITEMS;
        String valueField = attributes.path("itemValue").asText("");
        JsonNode actions = attributes.path("actions");

        ArrayNode items = MAPPER.createArrayNode();
        for (JsonNode item : all.subList(0, Math.min(max, all.size()))) {
            ObjectNode out = MAPPER.createObjectNode();
            out.put("value", fieldText(item, valueField));
            out.put("title", itemText(attributes.path("itemTitle").asText(""), item, variables));
            putIfPresent(out, "description", itemText(attributes.path("itemDescription").asText(""), item, variables));
            putIfPresent(out, "hint", itemText(attributes.path("itemHint").asText(""), item, variables));
            ArrayNode enabled = MAPPER.createArrayNode();
            if (actions.isArray()) {
                for (JsonNode action : actions) {
                    if (isEnabled(action.path("enabledWhen").asText(""), item)) {
                        enabled.add(action.path("id").asText());
                    }
                }
            }
            out.set("enabledActions", enabled);
            items.add(out);
        }
        resolved.set("items", items);
        resolved.put("totalItems", all.size());

        ArrayNode publicActions = MAPPER.createArrayNode();
        if (actions.isArray()) {
            for (JsonNode action : actions) {
                ObjectNode out = MAPPER.createObjectNode();
                out.put("id", action.path("id").asText());
                out.put("label", TemplateResolver.resolveTemplate(action.path("label").asText(""), variables));
                out.put("variant", action.path("variant").asText("primary"));
                publicActions.add(out);
            }
        }
        resolved.set("actions", publicActions);
        putLoadError(resolved, itemsVariable, sourceErrors);
        return resolved;
    }

    /** Opções vinculadas de um ui.select: cada item da lista precisa ter {@code label} e {@code value}. */
    public static void selectOptions(JsonNode attributes, Map<String, EngineVariable> variables,
                                     Map<String, SourceError> sourceErrors, ObjectNode resolved) {
        String optionsVariable = BindingResolver.engineVariableName(
                attributes.path("$bindings").path("options").path("path").asText(null));
        ArrayNode options = MAPPER.createArrayNode();
        for (JsonNode item : asList(optionsVariable != null ? variables.get(optionsVariable) : null)) {
            if (item.hasNonNull("label") && item.hasNonNull("value")) {
                ObjectNode option = MAPPER.createObjectNode();
                option.put("label", item.get("label").asText());
                option.put("value", item.get("value").asText());
                options.add(option);
            }
        }
        resolved.set("options", options);
        resolved.set("$bindings", withoutBinding(attributes.path("$bindings"), "options"));
        putLoadError(resolved, optionsVariable, sourceErrors);
    }

    /** Valor de variável do tipo lista: chega do motor como JSON em texto (variável Json) ou já como lista. */
    public static List<JsonNode> asList(EngineVariable variable) {
        Object value = variable != null ? variable.value() : null;
        JsonNode node;
        if (value instanceof String text) {
            try {
                node = MAPPER.readTree(text);
            } catch (Exception e) {
                return List.of();
            }
        } else {
            node = value == null ? null : MAPPER.valueToTree(value);
        }
        if (node == null || !node.isArray()) {
            return List.of();
        }
        List<JsonNode> list = new java.util.ArrayList<>();
        node.forEach(list::add);
        return list;
    }

    private static void resolveWritableBindings(JsonNode attributes, Map<String, EngineVariable> variables, ObjectNode resolved) {
        for (String key : List.of("value", "action")) {
            JsonNode binding = attributes.path("$bindings").path(key);
            Object current = BindingResolver.resolve(binding.path("path").asText(null), variables);
            if (current != null) {
                resolved.set(key, MAPPER.valueToTree(current));
            }
        }
    }

    private static void putLoadError(ObjectNode resolved, String variableName, Map<String, SourceError> sourceErrors) {
        SourceError error = variableName != null ? sourceErrors.get(variableName) : null;
        if (error != null) {
            ObjectNode loadError = MAPPER.createObjectNode();
            loadError.put("message", error.message());
            loadError.put("required", error.required());
            resolved.set("loadError", loadError);
        }
    }

    private static JsonNode withoutBinding(JsonNode bindings, String key) {
        if (!bindings.isObject()) {
            return bindings;
        }
        ObjectNode copy = ((ObjectNode) bindings).deepCopy();
        copy.remove(key);
        return copy;
    }

    private static String itemText(String template, JsonNode item, Map<String, EngineVariable> variables) {
        if (template.isBlank()) {
            return "";
        }
        Matcher matcher = ITEM_PLACEHOLDER.matcher(template);
        StringBuilder result = new StringBuilder();
        while (matcher.find()) {
            matcher.appendReplacement(result, Matcher.quoteReplacement(fieldText(item, matcher.group(1))));
        }
        matcher.appendTail(result);
        return TemplateResolver.resolveTemplate(result.toString(), variables).trim();
    }

    private static String fieldText(JsonNode item, String field) {
        JsonNode value = item.path(field);
        return value.isMissingNode() || value.isNull() ? "" : value.asText();
    }

    private static void putIfPresent(ObjectNode node, String key, String value) {
        if (value != null && !value.isBlank()) {
            node.put(key, value);
        }
    }

    // Mesma forma que o FlowValidator (admin/back) aceita: {{item.campo}} == / != literal.
    static boolean isEnabled(String rule, JsonNode item) {
        if (rule == null || rule.isBlank()) {
            return true;
        }
        Matcher matcher = ENABLED_WHEN.matcher(rule);
        if (!matcher.matches()) {
            return false;
        }
        JsonNode actual = item.path(matcher.group(1));
        String literal = matcher.group(3);
        boolean equal;
        if ("true".equals(literal) || "false".equals(literal)) {
            equal = !actual.isMissingNode() && !actual.isNull() && actual.asText().equalsIgnoreCase(literal);
        } else if (literal.startsWith("\"")) {
            equal = !actual.isMissingNode() && !actual.isNull() && actual.asText().equals(literal.substring(1, literal.length() - 1));
        } else {
            equal = actual.isNumber() && Double.compare(actual.asDouble(), Double.parseDouble(literal)) == 0
                    || actual.isTextual() && actual.asText().equals(literal);
        }
        return "==".equals(matcher.group(2)) == equal;
    }
}
