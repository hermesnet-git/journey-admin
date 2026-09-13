package com.jouney.admin.domain.execution;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/** Separa entrada/saída de uma chamada REST feita por um conector (SERVICE_TASK/RECEIVE_TASK) a
 * partir das variáveis locais que {@code HttpConnectorDelegate} (ms-runtime-camunda) grava —
 * compartilhado entre o Diagnóstico ({@code GetExecutionHistoryDetail}, histórico) e a Execução ao
 * vivo ({@code ExecutionStepResolver}), que precisam do mesmo critério (GET só lê → pedido é
 * entrada, resposta é saída; POST/PUT/PATCH/DELETE escrevem em algo externo → a chamada inteira é
 * saída) pra não divergir entre as duas telas. */
public final class ConnectorIO {

    private static final Set<String> WRITE_VERBS = Set.of("POST", "PUT", "PATCH", "DELETE");

    private ConnectorIO() {
    }

    public static boolean isWriteVerb(Object method) {
        return method != null && WRITE_VERBS.contains(String.valueOf(method).toUpperCase());
    }

    public static Map<String, Object> mergeMaps(Map<String, Object> first, Map<String, Object> second) {
        Map<String, Object> merged = new LinkedHashMap<>();
        if (first != null) merged.putAll(first);
        if (second != null) merged.putAll(second);
        return merged.isEmpty() ? null : merged;
    }

    public static Map<String, Object> restRequest(Map<String, Object> local) {
        Map<String, Object> request = new LinkedHashMap<>();
        putIfPresent(request, "method", local.get("method"));
        putIfPresent(request, "url", local.get("url"));
        putIfPresent(request, "headers", local.get("headers"));
        putIfPresent(request, "body", local.get("payload"));
        return request.isEmpty() ? null : request;
    }

    public static Map<String, Object> restResponse(Map<String, Object> local) {
        Map<String, Object> response = new LinkedHashMap<>();
        putIfPresent(response, "statusCode", local.get("statusCode"));
        putIfPresent(response, "response", local.get("response"));
        return response.isEmpty() ? null : response;
    }

    public static Map<String, Object> kafkaPayload(Object topic, Object payload) {
        Map<String, Object> result = new LinkedHashMap<>();
        putIfPresent(result, "topic", topic);
        putIfPresent(result, "payload", payload);
        return result.isEmpty() ? null : result;
    }

    public static void putIfPresent(Map<String, Object> map, String key, Object value) {
        if (value != null) {
            map.put(key, value);
        }
    }
}
