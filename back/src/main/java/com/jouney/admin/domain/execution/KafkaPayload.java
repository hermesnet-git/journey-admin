package com.jouney.admin.domain.execution;

import com.jouney.admin.domain.flow.ConnectorConfig;
import java.util.LinkedHashMap;
import java.util.Map;

/** Resolve o corpo de negócio de uma mensagem Kafka a publicar — mesma regra do worker automático
 * (equivalente Kafka do wf-journey-v1/ms-runtime-camunda): só {@code payloadMode="CUSTOM"} explícito
 * resolve o template configurado no nó; qualquer outra coisa (inclusive ausente) cai no automático
 * — dump de toda variável de processo, exceto as reservadas (prefixo {@code __}). */
public final class KafkaPayload {

    private KafkaPayload() {
    }

    public static Object resolveBusinessPayload(ConnectorConfig connectorConfig, Map<String, Object> rawVariables) {
        Map<String, Object> config = connectorConfig.getConfig() != null ? connectorConfig.getConfig() : Map.of();
        if ("CUSTOM".equals(config.get("payloadMode"))) {
            Map<String, String> vars = VariableTemplate.stringify(rawVariables);
            return VariableTemplate.resolveDeep(config.get("payload"), vars);
        }
        Map<String, Object> dump = new LinkedHashMap<>();
        rawVariables.forEach((name, value) -> {
            if (!name.startsWith("__")) {
                dump.put(name, value);
            }
        });
        return dump;
    }
}
