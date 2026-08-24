package com.jouney.especregistry.kafka;

/** O que {@link KafkaMessagePublisher#publish} de fato enviou — devolvido pra quem chamou poder
 * gravar como variável de processo (reservada, prefixo por nó — ver KAFKA_TOPIC_VAR_PREFIX/
 * KAFKA_PAYLOAD_VAR_PREFIX) e assim aparecer na trilha do log de execução, ao contrário de ficar só
 * nos logs do servidor. */
public record PublishedKafkaMessage(String topic, String payloadJson) {
}
