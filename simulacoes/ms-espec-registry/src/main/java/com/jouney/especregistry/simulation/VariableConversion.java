package com.jouney.especregistry.simulation;

import com.jayway.jsonpath.JsonPath;
import com.jayway.jsonpath.PathNotFoundException;
import com.jouney.especregistry.adminback.ConnectorConfig;
import com.jouney.especregistry.camunda.CamundaVariable;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** Converte as respostas do formulário (submissão real do tester) e o outputMapping de um
 * conector (valores fabricados para "Simular conclusão") para o formato de variável do Camunda. */
public final class VariableConversion {

    private static final Logger log = LoggerFactory.getLogger(VariableConversion.class);

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

    /** Mesma extração de {name, jsonPath, type} do outputMapping que fabricateFromOutputMapping usa
     * pro "Simular conclusão", mas aplicada a um payload Kafka real — usada pelo bridge quando uma
     * mensagem de verdade chega pra uma RECEIVE_TASK/MESSAGE_START_EVENT. Uma regra cujo jsonPath
     * não existe no payload é ignorada (log, não quebra a correlação inteira por causa de um campo
     * opcional ausente). */
    public static Map<String, CamundaVariable> resolveOutputMapping(String jsonBody, ConnectorConfig connectorConfig) {
        Map<String, CamundaVariable> variables = new HashMap<>();
        if (connectorConfig == null) {
            return variables;
        }
        for (Map<String, Object> rule : connectorConfig.outputMapping()) {
            if (!(rule.get("name") instanceof String name) || name.isBlank()
                    || !(rule.get("jsonPath") instanceof String jsonPath)) {
                continue;
            }
            String type = rule.get("type") instanceof String t ? t : "string";
            try {
                Object raw = JsonPath.read(jsonBody, jsonPath);
                variables.put(name, coerce(raw, type));
            } catch (PathNotFoundException e) {
                log.warn("Payload Kafka não tem o campo '{}' (regra de mapeamento '{}') — ignorando", jsonPath, name);
            }
        }
        return variables;
    }

    private static CamundaVariable coerce(Object raw, String type) {
        if (raw == null) {
            return new CamundaVariable(null, "Null");
        }
        return switch (type) {
            case "boolean" -> new CamundaVariable(raw instanceof Boolean b ? b : Boolean.parseBoolean(raw.toString()), "Boolean");
            case "number" -> new CamundaVariable(raw instanceof Number n ? n.doubleValue() : Double.parseDouble(raw.toString()), "Double");
            default -> new CamundaVariable(raw.toString(), "String");
        };
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
