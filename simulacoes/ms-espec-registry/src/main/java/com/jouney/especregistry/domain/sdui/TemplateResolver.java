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
 * `oneWay`/`twoWay` em qualquer atributo homologado (seção 8.1) — sempre no ms-espec-registry,
 * guardião do contrato SDUI, antes de a árvore sair pra qualquer consumidor (ms-journey, admin).
 * `oneWay` e `twoWay` resolvem o valor atual da variável do mesmo jeito aqui — a diferença entre os
 * dois só importa pro cliente (se o campo aceita edição e envia de volta ao submeter, ver
 * {@link #resolveTuple}), não pra montagem do valor inicial. Até 2026-09-12, `twoWay` nunca era
 * tocado aqui, sob a premissa de que era sempre um campo "virgem": REQ-03.09.011 proibia o mesmo
 * nome de variável em mais de um nó da jornada, então uma variável ligada por `twoWay` nunca podia
 * já ter um valor gravado na primeira (e única) vez que a tela aparecia. Essa premissa deixou de
 * valer quando REQ-03.09.011 passou a permitir reaproveitar o nome entre telas — pensado
 * exatamente pra uma etapa posterior reler e deixar editar um valor já coletado (o "recebe o valor
 * inicial... e devolve as alterações" da seção 8.1) — daí `twoWay` passar a ser resolvido igual a
 * `oneWay`: numa tela nunca visitada a variável ainda não existe (`BindingResolver.resolve` volta
 * null, campo nasce vazio como sempre), numa releitura ela já existe (o campo nasce com o valor
 * certo, editável). */
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
                String mode = binding.path("mode").asText(null);
                if (!"oneWay".equals(mode) && !"twoWay".equals(mode)) {
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
