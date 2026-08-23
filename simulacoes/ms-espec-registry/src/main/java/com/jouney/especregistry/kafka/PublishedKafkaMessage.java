package com.jouney.especregistry.kafka;

/** O que {@link KafkaMessagePublisher#publish} de fato enviou — devolvido pra quem chamou poder
 * gravar como variável de processo (mesma ideia do `__httpUrl__`/`__httpResponse__` do REST) e assim
 * aparecer na trilha do log de execução, ao contrário de ficar só nos logs do servidor. */
public record PublishedKafkaMessage(String topic, String payloadJson) {
}
