package com.jouney.runtimecamunda.delegate;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jayway.jsonpath.JsonPath;
import com.jayway.jsonpath.PathNotFoundException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.camunda.spin.Spin;
import org.camunda.spin.json.SpinJsonNode;
import org.springframework.stereotype.Component;

/**
 * Saída de integração do tipo "lista": lê um array da resposta e o grava como variável JSON do motor
 * (Spin), não como texto (limite de 4.000 caracteres) nem como objeto Java (binário, ilegível no
 * Diagnóstico). "Campos a manter" descarta o resto de cada item antes de gravar — o array inteiro
 * fica no histórico da instância, então só entra o que a tela e as regras usam.
 *
 * Usado pela expressão de saída do Service Task REST ({@code ${listOutput.extract(...)}}, gerada
 * pelo BpmnTransformer) e pelo KafkaConnectorWorker.
 */
@Component("listOutput")
public class ListOutput {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    // statusCode fora de 2xx vira lista vazia. Uma chamada só, sem um segundo método pro caso de erro:
    // a expressão do motor não aceita um método chamado "empty" (palavra reservada da linguagem).
    public SpinJsonNode extract(Object statusCode, String json, String jsonPath, String keepFieldsCsv) {
        int status = statusCode instanceof Number n ? n.intValue() : 0;
        if (status < 200 || status >= 300) {
            return toSpin(null, List.of());
        }
        Object raw;
        try {
            raw = json == null || json.isBlank() ? null : JsonPath.read(json, jsonPath);
        } catch (PathNotFoundException e) {
            raw = null;
        }
        return toSpin(raw, parseKeepFields(keepFieldsCsv));
    }

    public static List<String> parseKeepFields(String csv) {
        if (csv == null || csv.isBlank()) {
            return List.of();
        }
        return Arrays.stream(csv.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
    }

    /** Qualquer coisa que não seja lista vira lista vazia — a tela mostra "lista vazia", não quebra. */
    public static SpinJsonNode toSpin(Object raw, List<String> keepFields) {
        List<Object> items = new ArrayList<>();
        if (raw instanceof List<?> list) {
            for (Object item : list) {
                items.add(keepFields.isEmpty() || !(item instanceof Map<?, ?> map) ? item : keep(map, keepFields));
            }
        }
        try {
            return Spin.JSON(MAPPER.writeValueAsString(items));
        } catch (Exception e) {
            throw new IllegalStateException("Não foi possível converter a lista em JSON", e);
        }
    }

    private static Map<String, Object> keep(Map<?, ?> item, List<String> keepFields) {
        Map<String, Object> kept = new LinkedHashMap<>();
        for (String field : keepFields) {
            if (item.containsKey(field)) {
                kept.put(field, item.get(field));
            }
        }
        return kept;
    }
}
