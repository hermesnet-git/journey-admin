package com.jouney.admin.infrastructure.messaging;

import com.jouney.admin.application.messaging.MessagingTopicListingPort;
import com.jouney.admin.application.messaging.TopicListingResult;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.apache.kafka.clients.admin.AdminClient;
import org.apache.kafka.clients.admin.AdminClientConfig;
import org.springframework.stereotype.Component;

/**
 * Alimenta o seletor de tópico do editor de fluxo (US-03.09) com os tópicos reais do cluster
 * escolhido — o campo continua aceitando digitação livre no front (o tópico pode ainda não existir
 * no momento do design), isso aqui é só a sugestão. Movido de
 * ms-espec-registry/KafkaConnectionTestController (ver {@link KafkaConnectionTestAdapter}).
 */
@Component
public class KafkaTopicListingAdapter implements MessagingTopicListingPort {

    private static final int TIMEOUT_MS = 5_000;

    private final CredentialResolver credentialResolver;

    public KafkaTopicListingAdapter(CredentialResolver credentialResolver) {
        this.credentialResolver = credentialResolver;
    }

    @Override
    public TopicListingResult listTopics(String clusterType, String connectionAddress, String credentialReferenceName) {
        if (!"KAFKA".equals(clusterType)) {
            return new TopicListingResult(false, "Tipo de broker " + clusterType + " ainda não é suportado neste ambiente.", List.of());
        }

        try (AdminClient adminClient = AdminClient.create(adminClientConfig(connectionAddress, credentialReferenceName))) {
            List<String> topics = adminClient.listTopics().names().get(TIMEOUT_MS, TimeUnit.MILLISECONDS)
                    .stream().sorted().toList();
            return new TopicListingResult(true, null, topics);
        } catch (TimeoutException e) {
            return new TopicListingResult(false, "Cluster inacessível: tempo limite excedido ao conectar em " + connectionAddress + ".", List.of());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return new TopicListingResult(false, "Listagem de tópicos interrompida.", List.of());
        } catch (ExecutionException | RuntimeException e) {
            return new TopicListingResult(false, "Falha ao listar tópicos: " + rootMessage(e), List.of());
        }
    }

    private Map<String, Object> adminClientConfig(String connectionAddress, String credentialReferenceName) {
        Map<String, Object> config = new HashMap<>();
        config.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, connectionAddress);
        config.put(AdminClientConfig.REQUEST_TIMEOUT_MS_CONFIG, TIMEOUT_MS);
        if (credentialReferenceName != null && !credentialReferenceName.isBlank()) {
            credentialResolver.resolve(credentialReferenceName).ifPresent(config::putAll);
        }
        return config;
    }

    private String rootMessage(Throwable ex) {
        Throwable current = ex;
        while (current.getCause() != null && current.getCause() != current) {
            current = current.getCause();
        }
        return current.getMessage() != null ? current.getMessage() : current.getClass().getSimpleName();
    }
}
