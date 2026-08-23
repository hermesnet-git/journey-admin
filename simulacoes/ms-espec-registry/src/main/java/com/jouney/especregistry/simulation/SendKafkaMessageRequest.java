package com.jouney.especregistry.simulation;

/** {@code payload} nulo/ausente pede o mesmo payload que o worker automático geraria (resolvido a
 * partir do {@code config.payload} do nó); não-nulo é o corpo digitado manualmente pelo usuário. */
public record SendKafkaMessageRequest(Object payload) {
}
