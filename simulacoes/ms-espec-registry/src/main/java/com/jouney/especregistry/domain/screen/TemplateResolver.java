package com.jouney.especregistry.domain.screen;

import com.jouney.especregistry.domain.engine.EngineVariable;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/** Resolve o formato Hiccup canônico da tela (seção 6 do catálogo) contra as variáveis de
 * processo: interpolação `{{namespace.path}}` (ou `{{namespace_nome}}`, o nome da variável no motor) em qualquer atributo textual (seção 8.2) e binding
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

    // Token com namespace: form.nome ou data.pedido (contrato), ou form_nome / data_pedido (o nome real
    // da variável no motor) — [\w.-]* aceita ponto (separador de namespace), sublinhado e hífen (o id
    // do componente costuma ser Node_<uuid>, e UUID sempre tem hífen). Qualquer outro token (sem
    // prefixo, ou de outro namespace) não resolve nada e vira vazio; o FlowValidator (admin/back) o
    // recusa na validação/publicação.
    private static final Pattern PLACEHOLDER = Pattern.compile("\\{\\{\\s*([A-Za-z_][\\w.-]*)\\s*\\}\\}");
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private TemplateResolver() {
    }

    /** Resolve uma tupla Hiccup inteira (raiz `ui.screen` ou qualquer nó filho), recursivamente.
     * `$bindings`, `$events`, `$visibility` e `$active` são preservados no resultado — o cliente
     * ainda precisa deles pra binding `twoWay`, despacho de ação e reavaliação de visibilidade
     * sobre o que o usuário preenche antes de submeter. */
    public static JsonNode resolveTuple(JsonNode tuple, Map<String, EngineVariable> variables) {
        return resolveTuple(tuple, variables, Map.of());
    }

    /** {@code sourceErrors}: fontes de dados da tela que falharam, pelo nome da variável (data_&lt;apelido&gt;)
     * — a lista de seleção e o select que as usam recebem {@code loadError} (ADR-002). */
    public static JsonNode resolveTuple(JsonNode tuple, Map<String, EngineVariable> variables,
                                        Map<String, SourceError> sourceErrors) {
        if (tuple == null || !tuple.isArray() || tuple.size() < 2) {
            return tuple;
        }
        String type = tuple.get(0).asText();
        ArrayNode resolved = MAPPER.createArrayNode();
        resolved.add(tuple.get(0));
        if ("ui.selectList".equals(type)) {
            // Os itens são montados aqui, no servidor: {{item.x}} e as regras das ações nunca saem.
            resolved.add(ListMaterializer.selectList(tuple.get(1), variables, sourceErrors));
        } else {
            ObjectNode attributes = resolveAttributes(tuple.get(1), variables);
            if ("ui.select".equals(type) && tuple.get(1).path("$bindings").has("options")) {
                ListMaterializer.selectOptions(tuple.get(1), variables, sourceErrors, attributes);
            }
            resolved.add(attributes);
        }
        if (tuple.size() == 3) {
            ArrayNode children = MAPPER.createArrayNode();
            for (JsonNode child : tuple.get(2)) {
                children.add(resolveTuple(child, variables, sourceErrors));
            }
            resolved.add(children);
        }
        return resolved;
    }

    private static ObjectNode resolveAttributes(JsonNode attributes, Map<String, EngineVariable> variables) {
        ObjectNode resolved = MAPPER.createObjectNode();
        attributes.properties().forEach(entry -> {
            JsonNode value = entry.getValue();
            if (value.isTextual() && !entry.getKey().startsWith("$")) {
                resolved.put(entry.getKey(), resolveTemplate(value.asText(), variables));
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
                Object resolvedValue = BindingResolver.resolve(path, variables);
                if (resolvedValue != null) {
                    resolved.set(entry.getKey(), MAPPER.valueToTree(resolvedValue));
                }
            });
        }
        return resolved;
    }

    // Todo token passa por BindingResolver, com namespace explícito: {{form.nome}} / {{data.pedido}}
    // ou o nome da variável no motor, {{form_nome}} / {{data_pedido}} — não existe mais um caminho
    // "sem namespace" batendo direto na variável crua do motor (era o antigo {{nome}}, removido:
    // jornadas publicadas antes dessa mudança serão revisadas/republicadas, não precisa de
    // compatibilidade aqui).
    public static String resolveTemplate(String text, Map<String, EngineVariable> variables) {
        Matcher matcher = PLACEHOLDER.matcher(text);
        if (!matcher.find()) {
            return text;
        }
        StringBuilder result = new StringBuilder();
        do {
            String token = matcher.group(1);
            String name = BindingResolver.engineVariableNameOfPlaceholder(token);
            EngineVariable variable = name != null ? variables.get(name) : null;
            String replacement = variable != null && variable.value() != null ? String.valueOf(variable.value()) : "";
            matcher.appendReplacement(result, Matcher.quoteReplacement(replacement));
        } while (matcher.find());
        matcher.appendTail(result);
        return result.toString();
    }
}
