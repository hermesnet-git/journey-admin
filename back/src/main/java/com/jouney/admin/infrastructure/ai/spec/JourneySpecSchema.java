package com.jouney.admin.infrastructure.ai.spec;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** JSON Schema da ferramenta {@code generate_journey}: o formato da {@link JourneySpec}. */
public final class JourneySpecSchema {

    private JourneySpecSchema() {
    }

    private static Map<String, Object> string(String description) {
        return Map.of("type", "string", "description", description);
    }

    private static Map<String, Object> string() {
        return Map.of("type", "string");
    }

    private static Map<String, Object> enumOf(String... values) {
        return Map.of("type", "string", "enum", List.of(values));
    }

    private static Map<String, Object> array(Map<String, Object> items) {
        return Map.of("type", "array", "items", items);
    }

    private static Map<String, Object> object(Map<String, Object> properties, String... required) {
        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("type", "object");
        schema.put("properties", properties);
        if (required.length > 0) {
            schema.put("required", List.of(required));
        }
        return schema;
    }

    private static Map<String, Object> describe(Map<String, Object> schema, String description) {
        Map<String, Object> copy = new LinkedHashMap<>(schema);
        copy.put("description", description);
        return copy;
    }

    private static Map<String, Object> props(Object... keyValues) {
        Map<String, Object> map = new LinkedHashMap<>();
        for (int i = 0; i < keyValues.length; i += 2) {
            map.put((String) keyValues[i], keyValues[i + 1]);
        }
        return map;
    }

    private static Map<String, Object> output() {
        return object(props(
                "name", string("Nome da variável, só letras, números e sublinhado (ex.: pedidoId)"),
                "path", string("Onde ler na resposta: $.campo, $.lista[0].id ou $httpStatus para o código HTTP"),
                "type", enumOf("string", "number", "boolean", "date", "datetime", "list")), "name", "path");
    }

    private static Map<String, Object> block(int depth) {
        Map<String, Object> properties = props(
                "kind", enumOf("QUESTION", "TEXT", "ALERT", "DIVIDER", "INPUT", "TEXTAREA", "DATE", "SELECT", "CHECKBOX", "CARD", "BUTTON"),
                "answer", enumOf("CHOICE", "SCALE_5", "SCALE_10", "YES_NO", "SHORT_TEXT", "LONG_TEXT", "DATE", "CHECK"),
                "choices", array(string()),
                "text", string("TEXT: o texto; pode usar [[field:x]] e [[data:x]]"),
                "style", enumOf("title", "heading", "body"),
                "field", string("QUESTION e campos: nome curto em camelCase, só letras e números (ex.: notaNps); é por ele que decisões e textos citam a resposta"),
                "label", string("QUESTION e campos: o enunciado da pergunta; BUTTON: o texto do botão"),
                "placeholder", string(),
                "inputType", enumOf("text", "email", "tel", "number"),
                "required", Map.of("type", "boolean"),
                "options", array(object(props("label", string(), "value", string()), "label", "value")),
                "optionsFrom", string("SELECT: [[data:lista]] para usar uma lista vinda de uma integração (saída do tipo list)"),
                "severity", enumOf("positive", "informative", "warning", "negative"),
                "title", string("ALERT: título"),
                "message", string("ALERT: mensagem; pode usar [[field:x]] e [[data:x]]"),
                "choice", object(props("field", string(), "value", string()), "field", "value"),
                "variant", enumOf("primary", "secondary"));
        if (depth > 0) {
            properties.put("blocks", Map.of("type", "array", "description", "CARD: os blocos de dentro", "items", block(depth - 1)));
        }
        return object(properties, "kind");
    }

    private static Map<String, Object> step() {
        Map<String, Object> request = object(props(
                "method", enumOf("GET", "POST", "PUT", "PATCH", "DELETE"),
                "url", string("Endereço da API; só se o pedido informar. [[field:x]] e [[data:x]] valem aqui"),
                "bodyFields", Map.of("type", "array", "description",
                        "Só em POST/PUT/PATCH: os campos do corpo, um por item; value aceita [[field:x]] e [[data:x]]",
                        "items", object(props("name", string("Nome do campo no corpo (ex.: nome)"),
                                "value", string("Valor; ex.: [[field:nome]]")), "name", "value")),
                "outputs", array(output()),
                "readTimeoutMs", Map.of("type", "integer"),
                "retries", Map.of("type", "integer"),
                "background", Map.of("type", "boolean")), "method");
        Map<String, Object> message = object(props(
                "system", enumOf("KAFKA", "EVENT_HUBS", "SERVICE_BUS"),
                "payloadFields", Map.of("type", "array", "description",
                        "Só em PUBLISH_MESSAGE: os campos da mensagem, um por item; value aceita [[field:x]] e [[data:x]]",
                        "items", object(props("name", string(), "value", string()), "name", "value")),
                "outputs", array(output())));
        Map<String, Object> branch = object(props(
                "ref", string("O que comparar: field:nome, data:nome ou channel"),
                "op", enumOf("==", "!=", ">", "<"),
                "value", string("Valor de comparação, sempre como texto (ex.: 201, sim, true)"),
                "valueType", enumOf("string", "number", "boolean"),
                "valueRef", string("Em vez de value: outra referência, no mesmo formato de ref"),
                "label", string("Rótulo curto do caminho, opcional"),
                "to", string("key da etapa seguinte")), "ref", "op", "to");
        return object(props(
                "key", string("Identificador curto e único da etapa (ex.: pedeCpf)"),
                "kind", enumOf("SCREEN", "INTEGRATION", "PUBLISH_MESSAGE", "WAIT_MESSAGE", "DECISION", "END"),
                "name", string("Nome da etapa como o autor vê no canvas"),
                "description", string(),
                "screen", describe(object(props("title", string("Título da tela"),
                        "blocks", array(block(2))), "title", "blocks"), "SOMENTE em kind SCREEN: o que o usuário vê e responde"),
                "request", describe(request, "SOMENTE em kind INTEGRATION: a chamada à API"),
                "message", describe(message, "SOMENTE em kind PUBLISH_MESSAGE ou WAIT_MESSAGE"),
                "next", string("key da etapa seguinte (todas, menos DECISION e END)"),
                "onFailure", string("INTEGRATION: key da etapa para onde ir se a chamada falhar"),
                "branches", Map.of("type", "array", "description",
                        "OBRIGATÓRIO em kind DECISION (ao menos um caminho; nunca em outro kind): cada um compara uma referência com um valor e leva a uma etapa",
                        "items", branch),
                "otherwise", string("OBRIGATÓRIO em kind DECISION: key da etapa quando nenhum caminho de branches vale")), "key", "kind", "name");
    }

    public static Map<String, Object> schema() {
        return object(props(
                "name", string("Nome curto da jornada"),
                "inputs", Map.of("type", "array", "description", "Só se o pedido disser que o canal envia dados ao iniciar a jornada; senão omita",
                        "items", object(props("name", string(), "type", enumOf("string", "number", "boolean", "date", "datetime")), "name", "type")),
                "startMessage", object(props("system", enumOf("KAFKA", "EVENT_HUBS", "SERVICE_BUS"), "outputs", array(output())),
                        "system"),
                "steps", array(step()),
                "sections", array(object(props("name", string(), "steps", array(string())), "name", "steps")),
                "notes", array(object(props("text", string(), "steps", array(string())), "text"))),
                "name", "steps");
    }

    /** Perguntas ao usuário quando o pedido é vago: cada uma com respostas prontas; a primeira é a recomendada. */
    public static Map<String, Object> askSchema() {
        Map<String, Object> option = object(props(
                "label", string("A resposta pronta, curta, como o usuário a escolheria"),
                "description", string("Uma frase dizendo o que essa escolha muda na jornada")), "label");
        Map<String, Object> question = object(props(
                "question", string("A pergunta, curta e direta, em português"),
                "header", string("Rótulo de até 3 palavras (ex.: Objetivo, Canal)"),
                "options", Map.of("type", "array", "description",
                        "De 2 a 4 respostas prontas. A PRIMEIRA é a que você recomenda.", "items", option)),
                "question", "options");
        return object(props("questions", Map.of("type", "array", "description", "De 1 a 3 perguntas", "items", question)),
                "questions");
    }

    public static Map<String, Object> declineSchema() {
        return object(props("reason", string("Explicação curta, em pt-BR, de por que esse pedido não é sobre criar uma jornada.")), "reason");
    }
}
