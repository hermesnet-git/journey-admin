package com.jouney.admin.domain.execution;

import com.jouney.admin.domain.flow.ConnectorConfig;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** Converte respostas de formulário e variáveis de início pro tipo Java correto antes de mandar ao
 * motor — sem isso, tudo vira String e uma condição de Gateway numérica/booleana nunca bate. Mesma
 * regra do {@code VariableConversion} do ms-espec-registry, adaptada: aqui não precisamos do tipo
 * explícito na variável (formato {@code CamundaVariable}), só do valor Java certo — o motor infere
 * o tipo do JSON quando ele já é number/boolean/string (ver {@code
 * RuntimeEngineMonitoringAdapter.wrapValues}). */
public final class AnswerConversion {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private AnswerConversion() {
    }

    private record FieldSpec(String type, String inputMode) {
    }

    /** {@code sduiEnvelope} é o {@code sdui} opaco de {@link ResolvedForm} (o envelope inteiro,
     * schemaVersion/.../data) — navegado aqui só pra achar, por nome de campo, o tipo do componente
     * e seu {@code inputMode}. */
    public static Map<String, Object> fromAnswers(Object sduiEnvelope, Map<String, Object> answers) {
        JsonNode data = MAPPER.valueToTree(sduiEnvelope).path("data");
        Map<String, FieldSpec> specs = new LinkedHashMap<>();
        collectFieldSpecs(data, specs);
        Map<String, Object> converted = new LinkedHashMap<>();
        answers.forEach((name, raw) -> {
            if (raw != null) {
                converted.put(name, convert(specs.get(name), raw));
            }
        });
        return converted;
    }

    private static void collectFieldSpecs(JsonNode tuple, Map<String, FieldSpec> specs) {
        if (tuple == null || !tuple.isArray() || tuple.size() < 2) {
            return;
        }
        String type = tuple.get(0).asText();
        JsonNode attributes = tuple.get(1);
        JsonNode binding = attributes.path("$bindings").path("value");
        String path = binding.path("path").asText("");
        if (path.startsWith("form.")) {
            String name = path.substring("form.".length());
            specs.put(name, new FieldSpec(type, attributes.path("inputMode").asText(null)));
        }
        if (tuple.size() == 3) {
            tuple.get(2).forEach(child -> collectFieldSpecs(child, specs));
        }
    }

    private static Object convert(FieldSpec spec, Object raw) {
        if (spec != null && "ui.textInput".equals(spec.type())
                && ("number".equals(spec.inputMode()) || "decimal".equals(spec.inputMode()))) {
            return Double.valueOf(raw.toString());
        }
        if (spec != null && "ui.checkbox".equals(spec.type())) {
            return raw instanceof Boolean b ? b : Boolean.valueOf(raw.toString());
        }
        return raw.toString();
    }

    /** REQ-03.12.003: variáveis que o chamador informou de verdade, coercionadas pelo {@code type}
     * declarado no nó START. Toda declaração precisa ter valor correspondente — nomes faltantes
     * acumulam e lançam {@link IllegalStateException}. Chaves não declaradas são aceitas do mesmo
     * jeito (REQ-03.12.005), sem coerção (o motor infere pelo tipo Java já recebido do JSON). */
    public static Map<String, Object> fromDeclaredVariables(Map<String, Object> raw, List<Map<String, Object>> declarations) {
        Map<String, Object> source = raw != null ? raw : Map.of();
        Map<String, Object> variables = new LinkedHashMap<>();
        List<String> missing = new ArrayList<>();
        for (Map<String, Object> declaration : declarations) {
            if (!(declaration.get("name") instanceof String name) || name.isBlank()) {
                continue;
            }
            if (!source.containsKey(name)) {
                missing.add(name);
                continue;
            }
            String type = declaration.get("type") instanceof String t ? t : "string";
            variables.put(name, coerce(source.get(name), type));
        }
        if (!missing.isEmpty()) {
            throw new IllegalStateException("Variáveis de entrada obrigatórias não informadas: " + missing);
        }
        source.forEach(variables::putIfAbsent);
        return variables;
    }

    private static Object coerce(Object raw, String type) {
        if (raw == null) {
            return null;
        }
        return switch (type) {
            case "boolean" -> raw instanceof Boolean b ? b : Boolean.parseBoolean(raw.toString());
            case "number" -> raw instanceof Number n ? n.doubleValue() : Double.parseDouble(raw.toString());
            default -> raw.toString();
        };
    }

    /** Valores fabricados pro outputMapping de um MESSAGE_START_EVENT — usado quando o usuário
     * inicia pelo botão "Iniciar" em vez de mandar uma mensagem de teste de verdade (o payload real
     * nunca existiu, então não há nada pra extrair; só simula que a mensagem trouxe esses campos). */
    @SuppressWarnings("unchecked")
    public static Map<String, Object> fabricateFromOutputMapping(ConnectorConfig connectorConfig) {
        Map<String, Object> variables = new LinkedHashMap<>();
        if (connectorConfig == null || connectorConfig.getConfig() == null) {
            return variables;
        }
        Object raw = connectorConfig.getConfig().get("outputMapping");
        if (!(raw instanceof List<?> rules)) {
            return variables;
        }
        for (Object item : rules) {
            if (!(item instanceof Map<?, ?> rule)) {
                continue;
            }
            if (!(rule.get("name") instanceof String name) || name.isBlank()) {
                continue;
            }
            String type = rule.get("type") instanceof String t ? t : "string";
            variables.put(name, fabricate(type));
        }
        return variables;
    }

    private static Object fabricate(String type) {
        return switch (type) {
            case "boolean" -> ThreadLocalRandom.current().nextBoolean();
            case "number" -> (double) ThreadLocalRandom.current().nextInt(0, 101);
            case "date" -> LocalDate.now().toString();
            case "datetime" -> OffsetDateTime.now().toString();
            default -> "SIMULADO-" + ThreadLocalRandom.current().nextInt(1000, 9999);
        };
    }
}
