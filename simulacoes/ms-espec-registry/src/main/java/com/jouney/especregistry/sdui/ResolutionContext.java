package com.jouney.especregistry.sdui;

import com.jouney.especregistry.camunda.CamundaVariable;
import java.util.Map;

/** Contexto de resolução dos namespaces `session`/`route` de um binding (seção 8 do catálogo) —
 * `route` não tem fonte real ainda (continua sempre vazio); `session.channel` vem do canal
 * declarado ao iniciar a instância (?channel=...), injetado como variável de processo real. */
public record ResolutionContext(Map<String, Object> session, Map<String, Object> route) {

    public static final ResolutionContext EMPTY = new ResolutionContext(Map.of(), Map.of());

    public static ResolutionContext fromProcessVariables(Map<String, CamundaVariable> processVariables) {
        CamundaVariable channel = processVariables.get("channel");
        if (channel == null) {
            return EMPTY;
        }
        return new ResolutionContext(Map.of("channel", channel.value()), Map.of());
    }
}
