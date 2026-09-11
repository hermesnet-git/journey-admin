package com.jouney.especregistry.domain.sdui;

import com.jouney.especregistry.domain.engine.EngineVariable;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/** Resolve o formato Hiccup canônico da tela (seção 6 do catálogo) contra as variáveis de
 * processo: interpolação `{{namespace.path}}` em qualquer atributo textual (seção 8.2) e binding
 * `oneWay` em qualquer atributo homologado (seção 8.1) — sempre no ms-espec-registry, guardião do
 * contrato SDUI, antes de a árvore sair pra qualquer consumidor (ms-journey, admin). Binding
 * `twoWay` nunca é tocado aqui: é estado de edição de um formulário ainda não submetido, que só
 * existe no cliente enquanto o usuário preenche a tela. */
public final class TemplateResolver {

    // Token com namespace (form.nome) ou legado sem namespace ({{nome}}, ainda usado por messageText
    // de USER_TASK — sintaxe REQ-03.09.012, não faz parte do binding namespace-aware do catálogo SDUI).
    private static final Pattern PLACEHOLDER = Pattern.compile("\\{\\{\\s*([A-Za-z_][\\w.]*)\\s*\\}\\}");
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private TemplateResolver() {
    }

    /** Resolve uma tupla Hiccup inteira (raiz `ui.screen` ou qualquer nó filho), recursivamente.
     * `$bindings`, `$events`, `$visibility` e `$active` são preservados no resultado — o cliente
     * ainda precisa deles pra binding `twoWay`, despacho de ação e reavaliação de visibilidade
     * sobre o que o usuário preenche antes de submeter. */
    public static JsonNode resolveTuple(JsonNode tuple, Map<String, EngineVariable> variables, ResolutionContext ctx) {
        if (tuple == null || !tuple.isArray() || tuple.size() < 2) {
            return tuple;
        }
        ArrayNode resolved = MAPPER.createArrayNode();
        resolved.add(tuple.get(0));
        resolved.add(resolveAttributes(tuple.get(1), variables, ctx));
        if (tuple.size() == 3) {
            ArrayNode children = MAPPER.createArrayNode();
            for (JsonNode child : tuple.get(2)) {
                children.add(resolveTuple(child, variables, ctx));
            }
            resolved.add(children);
        }
        return resolved;
    }

    private static ObjectNode resolveAttributes(JsonNode attributes, Map<String, EngineVariable> variables, ResolutionContext ctx) {
        ObjectNode resolved = MAPPER.createObjectNode();
        attributes.properties().forEach(entry -> {
            JsonNode value = entry.getValue();
            if (value.isTextual() && !entry.getKey().startsWith("$")) {
                resolved.put(entry.getKey(), resolveTemplate(value.asText(), variables, ctx));
            } else {
                resolved.set(entry.getKey(), value);
            }
        });
        JsonNode bindings = attributes.path("$bindings");
        if (bindings.isObject()) {
            bindings.properties().forEach(entry -> {
                JsonNode binding = entry.getValue();
                if (!"oneWay".equals(binding.path("mode").asText(null))) {
                    return;
                }
                String path = binding.path("path").asText(null);
                if (path == null) {
                    return;
                }
                Object resolvedValue = BindingResolver.resolve(path, variables, ctx);
                if (resolvedValue != null) {
                    resolved.set(entry.getKey(), MAPPER.valueToTree(resolvedValue));
                }
            });
        }
        return resolved;
    }

    public static String resolveTemplate(String text, Map<String, EngineVariable> variables, ResolutionContext ctx) {
        Matcher matcher = PLACEHOLDER.matcher(text);
        if (!matcher.find()) {
            return text;
        }
        StringBuilder result = new StringBuilder();
        do {
            String token = matcher.group(1);
            Object resolved = token.indexOf('.') >= 0
                    ? BindingResolver.resolve(token, variables, ctx)
                    : legacyLookup(token, variables);
            String replacement = resolved != null ? String.valueOf(resolved) : "";
            matcher.appendReplacement(result, Matcher.quoteReplacement(replacement));
        } while (matcher.find());
        matcher.appendTail(result);
        return result.toString();
    }

    // {{nome}} sem namespace — sintaxe legada de messageText (REQ-03.09.012), continua batendo
    // direto no nome da variável Camunda, sem passar por BindingResolver.
    private static String legacyLookup(String name, Map<String, EngineVariable> variables) {
        EngineVariable variable = variables.get(name);
        return variable != null && variable.value() != null ? String.valueOf(variable.value()) : "";
    }
}
