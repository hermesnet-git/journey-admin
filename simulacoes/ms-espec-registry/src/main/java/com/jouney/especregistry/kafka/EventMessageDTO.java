package com.jouney.especregistry.kafka;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.LinkedHashMap;
import java.util.Map;

/** Mesmo envelope do wf-journey-v1, também usado pelo worker Kafka do ms-runtime-camunda
 * (KafkaConnectorWorker.buildEnvelope) — o que é publicado/testado por aqui precisa ter o mesmo
 * formato pra ser consumido/correlacionado do outro lado. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record EventMessageDTO(String correlationId, String messageName, PayloadMessageDTO payload) {

    /** Extrai {@code status}/{@code code} de dentro do corpo de negócio (se presentes) e promove a
     * campos de topo; o resto cai em {@code payload.data} — mesma regra do worker. */
    public static EventMessageDTO wrap(String correlationId, String messageName, Object businessPayload) {
        Map<String, Object> data = new LinkedHashMap<>();
        if (businessPayload instanceof Map<?, ?> map) {
            map.forEach((k, v) -> data.put(String.valueOf(k), v));
        } else if (businessPayload != null) {
            data.put("value", businessPayload);
        }
        String status = asString(data.remove("status"));
        String code = asString(data.remove("code"));
        return new EventMessageDTO(correlationId, messageName, new PayloadMessageDTO(status, code, data));
    }

    private static String asString(Object value) {
        return value != null ? String.valueOf(value) : null;
    }
}
