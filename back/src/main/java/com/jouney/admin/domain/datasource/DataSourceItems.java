package com.jouney.admin.domain.datasource;

import java.util.ArrayList;
import java.util.List;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * Lê a lista de uma resposta de fonte de dados e deixa em cada item só os campos expostos. Caminho
 * simples: {@code $} (a resposta já é a lista) ou {@code $.campo.subcampo} — mesma regra do
 * ms-espec-registry, que faz isso em execução.
 */
public final class DataSourceItems {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private DataSourceItems() {
    }

    public static ArrayNode extract(JsonNode response, String itemsPath, List<String> exposedFields) {
        JsonNode node = response;
        String path = itemsPath == null || itemsPath.isBlank() ? "$" : itemsPath.trim();
        if (!"$".equals(path)) {
            for (String segment : path.substring(2).split("\\.")) {
                node = node == null ? null : node.get(segment);
            }
        }
        ArrayNode items = MAPPER.createArrayNode();
        if (node == null || !node.isArray()) {
            return items;
        }
        for (JsonNode item : node) {
            if (exposedFields.isEmpty() || !item.isObject()) {
                items.add(item);
                continue;
            }
            ObjectNode kept = MAPPER.createObjectNode();
            for (String field : exposedFields) {
                if (item.has(field)) kept.set(field, item.get(field));
            }
            items.add(kept);
        }
        return items;
    }

    /** Caminho da lista: {@code $} ou {@code $.a.b}. */
    public static boolean isValidPath(String itemsPath) {
        return itemsPath != null && itemsPath.trim().matches("\\$(\\.[A-Za-z_][A-Za-z0-9_-]*)*");
    }

    public static List<String> normalizeFields(List<String> fields) {
        List<String> result = new ArrayList<>();
        if (fields != null) {
            fields.stream().map(String::trim).filter(f -> !f.isEmpty() && !result.contains(f)).forEach(result::add);
        }
        return result;
    }
}
