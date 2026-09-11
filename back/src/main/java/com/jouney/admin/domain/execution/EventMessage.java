package com.jouney.admin.domain.execution;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.LinkedHashMap;
import java.util.Map;

/** Mesmo envelope usado pelo worker Kafka do {@code ms-runtime-camunda} e pelo canal digital real —
 * o que é publicado por aqui (envio manual de teste) precisa ter o mesmo formato pra ser consumido/
 * correlacionado do outro lado. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record EventMessage(String correlationId, String messageName, Payload payload) {

    public record Payload(String status, String code, Map<String, Object> data) {
    }

    /** Extrai {@code status}/{@code code} de dentro do corpo de negócio (se presentes) e promove a
     * campos de topo; o resto cai em {@code payload.data}. */
    public static EventMessage wrap(String correlationId, String messageName, Object businessPayload) {
        Map<String, Object> data = new LinkedHashMap<>();
        if (businessPayload instanceof Map<?, ?> map) {
            map.forEach((k, v) -> data.put(String.valueOf(k), v));
        } else if (businessPayload != null) {
            data.put("value", businessPayload);
        }
        String status = asString(data.remove("status"));
        String code = asString(data.remove("code"));
        return new EventMessage(correlationId, messageName, new Payload(status, code, data));
    }

    private static String asString(Object value) {
        return value != null ? String.valueOf(value) : null;
    }
}
