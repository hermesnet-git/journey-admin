package com.jouney.especregistry.simulation;

import com.jouney.especregistry.adminback.ConnectorConfig;
import com.jouney.especregistry.camunda.CamundaVariable;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

/** Converte as respostas do formulário (submissão real do tester) e o outputMapping de um
 * conector (valores fabricados para "Simular conclusão") para o formato de variável do Camunda. */
public final class VariableConversion {

    private VariableConversion() {
    }

    public static Map<String, CamundaVariable> fromAnswers(List<Object> sdui, Map<String, Object> answers) {
        Map<String, SduiForm.FieldSpec> specs = SduiForm.fields(sdui).stream()
                .collect(Collectors.toMap(SduiForm.FieldSpec::name, f -> f, (a, b) -> a));
        Map<String, CamundaVariable> variables = new HashMap<>();
        for (Map.Entry<String, Object> entry : answers.entrySet()) {
            if (entry.getValue() == null) {
                continue;
            }
            variables.put(entry.getKey(), convertAnswer(specs.get(entry.getKey()), entry.getValue()));
        }
        return variables;
    }

    private static CamundaVariable convertAnswer(SduiForm.FieldSpec spec, Object raw) {
        if (spec != null && "ui.input".equals(spec.tag()) && "number".equals(spec.inputType())) {
            return new CamundaVariable(Double.valueOf(raw.toString()), "Double");
        }
        if (spec != null && "ui.multiselect".equals(spec.tag()) && raw instanceof List<?> list) {
            String joined = list.stream().map(String::valueOf).collect(Collectors.joining(","));
            return new CamundaVariable(joined, "String");
        }
        return new CamundaVariable(raw.toString(), "String");
    }

    public static Map<String, CamundaVariable> fabricateFromOutputMapping(ConnectorConfig connectorConfig) {
        Map<String, CamundaVariable> variables = new HashMap<>();
        if (connectorConfig == null) {
            return variables;
        }
        for (Map<String, Object> rule : connectorConfig.outputMapping()) {
            if (!(rule.get("name") instanceof String name) || name.isBlank()) {
                continue;
            }
            String type = rule.get("type") instanceof String t ? t : "string";
            variables.put(name, fabricate(type));
        }
        return variables;
    }

    private static CamundaVariable fabricate(String type) {
        return switch (type) {
            case "boolean" -> new CamundaVariable(ThreadLocalRandom.current().nextBoolean(), "Boolean");
            case "number" -> new CamundaVariable((double) ThreadLocalRandom.current().nextInt(0, 101), "Double");
            case "date" -> new CamundaVariable(LocalDate.now().toString(), "String");
            case "datetime" -> new CamundaVariable(OffsetDateTime.now().toString(), "String");
            default -> new CamundaVariable("SIMULADO-" + ThreadLocalRandom.current().nextInt(1000, 9999), "String");
        };
    }
}
