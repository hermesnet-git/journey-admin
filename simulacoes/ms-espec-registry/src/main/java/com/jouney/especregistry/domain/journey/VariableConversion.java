package com.jouney.especregistry.domain.journey;

import com.jouney.especregistry.domain.engine.EngineVariable;
import com.jouney.especregistry.domain.sdui.CanonicalFormat;
import tools.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/** Converte as respostas do formulário (submissão real do tester) para o formato de variável do
 * Runtime Engine. */
public final class VariableConversion {

    private VariableConversion() {
    }

    public static Map<String, EngineVariable> fromAnswers(JsonNode sdui, Map<String, Object> answers) {
        Map<String, CanonicalFormat.FieldSpec> specs = CanonicalFormat.fields(sdui).stream()
                .collect(Collectors.toMap(CanonicalFormat.FieldSpec::name, f -> f, (a, b) -> a));
        Map<String, EngineVariable> variables = new HashMap<>();
        for (Map.Entry<String, Object> entry : answers.entrySet()) {
            if (entry.getValue() == null) {
                continue;
            }
            variables.put(entry.getKey(), convertAnswer(specs.get(entry.getKey()), entry.getValue()));
        }
        return variables;
    }

    private static EngineVariable convertAnswer(CanonicalFormat.FieldSpec spec, Object raw) {
        if (spec != null && "ui.textInput".equals(spec.type())
                && ("number".equals(spec.inputMode()) || "decimal".equals(spec.inputMode()))) {
            return new EngineVariable(Double.valueOf(raw.toString()), "Double");
        }
        if (spec != null && "ui.checkbox".equals(spec.type())) {
            return new EngineVariable(Boolean.valueOf(raw.toString()), "Boolean");
        }
        return new EngineVariable(raw.toString(), "String");
    }

    /** REQ-03.12.003: variáveis que o chamador (canal digital/BFF) informou de verdade no
     * {@code POST .../instances}, coercionadas pelo {@code type} declarado no nó START. Toda
     * declaração precisa ter valor correspondente em {@code raw} — nomes faltantes acumulam e
     * lançam {@link IllegalStateException} (mesmo padrão de erro das outras validações deste
     * controller, mapeado pra 409 pelo GlobalExceptionHandler). Chaves de {@code raw} que não
     * batem com nenhuma declaração são aceitas e incluídas também (REQ-03.12.005), tipadas por
     * inferência simples do tipo Java recebido do Jackson. */
    public static Map<String, EngineVariable> fromDeclaredVariables(Map<String, Object> raw,
                                                                      List<Map<String, Object>> declarations) {
        Map<String, Object> source = raw != null ? raw : Map.of();
        Map<String, EngineVariable> variables = new HashMap<>();
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
        Set<String> declaredNames = variables.keySet();
        source.forEach((name, value) -> {
            if (!declaredNames.contains(name)) {
                variables.put(name, inferType(value));
            }
        });
        return variables;
    }

    private static EngineVariable inferType(Object value) {
        if (value == null) {
            return new EngineVariable(null, "Null");
        }
        if (value instanceof Boolean b) {
            return new EngineVariable(b, "Boolean");
        }
        if (value instanceof Number n) {
            return new EngineVariable(n.doubleValue(), "Double");
        }
        return new EngineVariable(value.toString(), "String");
    }

    private static EngineVariable coerce(Object raw, String type) {
        if (raw == null) {
            return new EngineVariable(null, "Null");
        }
        return switch (type) {
            case "boolean" -> new EngineVariable(raw instanceof Boolean b ? b : Boolean.parseBoolean(raw.toString()), "Boolean");
            case "number" -> new EngineVariable(raw instanceof Number n ? n.doubleValue() : Double.parseDouble(raw.toString()), "Double");
            default -> new EngineVariable(raw.toString(), "String");
        };
    }
}
