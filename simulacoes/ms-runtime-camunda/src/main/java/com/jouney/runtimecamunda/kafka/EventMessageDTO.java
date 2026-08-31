package com.jouney.runtimecamunda.kafka;

import com.fasterxml.jackson.annotation.JsonInclude;

/** Mesmo envelope de mensagem do wf-journey-v1 ({@code EventMessageDTO}), portado aqui pra publicar
 * e consumir no mesmo formato: {@code messageName} é opcional — quando ausente, o Camunda correlaciona
 * pelo evento que a instância estiver esperando, sem exigir nome. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record EventMessageDTO(String correlationId, String messageName, PayloadMessageDTO payload) {
}
