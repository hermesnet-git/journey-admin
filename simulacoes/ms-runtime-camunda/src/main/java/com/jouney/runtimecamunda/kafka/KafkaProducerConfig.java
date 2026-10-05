package com.jouney.runtimecamunda.kafka;

import com.jouney.runtimecamunda.config.KafkaProperties;
import java.util.HashMap;
import java.util.Map;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;

@Configuration
public class KafkaProducerConfig {

    @Bean
    public ProducerFactory<String, String> kafkaProducerFactory(KafkaProperties properties) {
        Map<String, Object> config = new HashMap<>();
        config.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, properties.bootstrapServers());
        config.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        config.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        // Broker fora do ar não pode travar o ciclo do worker (que também consome): sem estes limites o envio espera
        // até 60 s pelos metadados. O tempo limite de cada etapa (até 10 s) é aplicado em cima disso, em KafkaConnectorWorker.
        config.put(ProducerConfig.MAX_BLOCK_MS_CONFIG, 10_000);
        config.put(ProducerConfig.REQUEST_TIMEOUT_MS_CONFIG, 5_000);
        config.put(ProducerConfig.DELIVERY_TIMEOUT_MS_CONFIG, 10_000);
        return new DefaultKafkaProducerFactory<>(config);
    }

    @Bean
    public KafkaTemplate<String, String> kafkaTemplate(ProducerFactory<String, String> kafkaProducerFactory) {
        return new KafkaTemplate<>(kafkaProducerFactory);
    }
}
