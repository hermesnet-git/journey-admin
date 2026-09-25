package com.jouney.especregistry.domain.sdui;

import tools.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.List;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Operações estruturais sobre o formato Hiccup publicado, sem interpretar layout. */
public final class CanonicalFormat {

    // Mesmo padrão de TemplateResolver.PLACEHOLDER (hífen incluído — id de componente costuma ser
    // Node_<uuid>, e UUID sempre tem hífen), replicado (não importado) de propósito: esta classe só
    // faz inspeção estrutural do envelope, nunca resolve valor — importar TemplateResolver criaria
    // uma dependência na direção errada.
    private static final Pattern PLACEHOLDER = Pattern.compile("\\{\\{\\s*([A-Za-z_][\\w.-]*)\\s*\\}\\}");

    private CanonicalFormat() {
    }

    public record FieldSpec(String name, String type, String inputMode) {
    }

    public static void validateEnvelope(ScreenEnvelope envelope) {
        if (!"1.0.0".equals(envelope.schemaVersion()) || !"1.0.0".equals(envelope.catalogVersion())) {
            throw new IllegalArgumentException("Versão de contrato SDUI não suportada");
        }
        if (envelope.journeyVersion() < 1 || envelope.uiStepId() == null || envelope.uiStepId().isBlank()) {
            throw new IllegalArgumentException("journeyVersion e uiStepId são obrigatórios");
        }
        if (envelope.dataSources() == null || !envelope.dataSources().isEmpty()) {
            throw new IllegalArgumentException("dataSources deve ser um objeto vazio no SDUI v1");
        }
        validateTuple(envelope.data(), true);
    }

    public static List<FieldSpec> fields(JsonNode root) {
        List<FieldSpec> fields = new ArrayList<>();
        collectFields(root, fields);
        return fields;
    }

    /** Retorna somente variáveis explicitamente referenciadas pela tela publicada. */
    public static Set<String> referencedProcessVariables(JsonNode root) {
        Set<String> names = new LinkedHashSet<>();
        collectReferences(root, names);
        return names;
    }

    private static void validateTuple(JsonNode tuple, boolean root) {
        if (tuple == null || !tuple.isArray() || tuple.size() < 2 || tuple.size() > 3
                || !tuple.get(0).isTextual() || !tuple.get(1).isObject()) {
            throw new IllegalArgumentException("Tupla SDUI inválida");
        }
        String type = tuple.get(0).asText();
        if (root && !"ui.screen".equals(type)) {
            throw new IllegalArgumentException("data deve conter uma raiz ui.screen");
        }
        JsonNode attributes = tuple.get(1);
        if (!attributes.path("id").isTextual() || !attributes.path("version").isTextual()) {
            throw new IllegalArgumentException("Todo componente exige id e version");
        }
        if (tuple.size() == 3) {
            JsonNode children = tuple.get(2);
            if (!children.isArray()) throw new IllegalArgumentException("Filhos devem ser um array");
            for (JsonNode child : children) validateTuple(child, false);
        }
    }

    private static void collectFields(JsonNode tuple, List<FieldSpec> fields) {
        if (tuple == null || !tuple.isArray() || tuple.size() < 2) return;
        String type = tuple.get(0).asText();
        JsonNode attributes = tuple.get(1);
        JsonNode binding = attributes.path("$bindings").path("value");
        String path = binding.path("path").asText("");
        if (path.startsWith("form.")) {
            fields.add(new FieldSpec(path.substring("form.".length()), type,
                    attributes.path("inputMode").asText(null)));
        }
        if (tuple.size() == 3) for (JsonNode child : tuple.get(2)) collectFields(child, fields);
    }

    private static void collectReferences(JsonNode tuple, Set<String> names) {
        if (tuple == null || !tuple.isArray() || tuple.size() < 2) return;
        JsonNode attributes = tuple.get(1);
        collectPath(attributes.path("$bindings"), names);
        collectPath(attributes.path("$visibility"), names);
        collectPath(attributes.path("$active"), names);
        // Placeholder textual (seção 8.2): {{form.nome}} dentro de um atributo de conteúdo (text,
        // label, title, message...) referencia variável do processo igual a um binding, mas nunca
        // passa por $bindings — sem isto, a variável nunca entrava no contexto que
        // ResolveScreenForNode.runtimeContext monta, e o placeholder sempre virava string vazia em
        // runtime (BindingResolver.resolve não encontrava a variável, nunca a mensagem ficava
        // literalmente "{{...}}" — o pior tipo de falha, silenciosa).
        attributes.properties().forEach(entry -> {
            if (!entry.getKey().startsWith("$") && entry.getValue().isTextual()) {
                collectPlaceholders(entry.getValue().asText(), names);
            }
        });
        if (tuple.size() == 3) for (JsonNode child : tuple.get(2)) collectReferences(child, names);
    }

    private static void collectPlaceholders(String text, Set<String> names) {
        Matcher matcher = PLACEHOLDER.matcher(text);
        while (matcher.find()) {
            String path = matcher.group(1);
            int dot = path.indexOf('.');
            if (dot > 0 && (path.startsWith("form.") || path.startsWith("data."))) {
                names.add(path.substring(0, dot) + "_" + path.substring(dot + 1));
            }
        }
    }

    // Guarda o nome JÁ com o prefixo de namespace (form_x/data_x) — é assim que a variável existe de
    // verdade no motor (ver BindingResolver/VariableConversion); guardar só o sufixo cru fazia
    // ResolveScreenForNode.runtimeContext nunca encontrar a variável real ao comparar contra
    // rawVariables (que já vêm prefixadas).
    private static void collectPath(JsonNode node, Set<String> names) {
        if (node.isObject()) {
            String path = node.path("path").asText("");
            int dot = path.indexOf('.');
            if (dot > 0 && (path.startsWith("form.") || path.startsWith("data."))) {
                names.add(path.substring(0, dot) + "_" + path.substring(dot + 1));
            }
            node.properties().forEach(entry -> collectPath(entry.getValue(), names));
        } else if (node.isArray()) {
            node.forEach(child -> collectPath(child, names));
        }
    }
}
