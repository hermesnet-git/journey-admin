package com.jouney.especregistry.kafka;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.apache.kafka.clients.admin.AdminClient;
import org.apache.kafka.clients.admin.AdminClientConfig;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Teste de conexão e listagem de tópicos do catálogo de integrações (FT-14) — só metadado, nunca
 * publica ou consome uma mensagem real. Único componente que fala com o broker de verdade: o
 * admin-back nunca chama isso diretamente do navegador, sempre via chamada de servidor a servidor.
 */
@RestController
@RequestMapping("/api/v1")
public class KafkaConnectionTestController {

    private static final int TIMEOUT_MS = 5_000;

    private final CredentialResolver credentialResolver;

    public KafkaConnectionTestController(CredentialResolver credentialResolver) {
        this.credentialResolver = credentialResolver;
    }

    @PostMapping("/connection-tests")
    public ConnectionTestResponse test(@RequestBody ConnectionTestRequest request) {
        if (!"KAFKA".equals(request.clusterType())) {
            return new ConnectionTestResponse(false,
                    "Tipo de broker " + request.clusterType() + " ainda não é suportado neste ambiente.");
        }

        try (AdminClient adminClient = AdminClient.create(adminClientConfig(request))) {
            adminClient.describeCluster().nodes().get(TIMEOUT_MS, TimeUnit.MILLISECONDS);
            return new ConnectionTestResponse(true, "Conexão estabelecida com sucesso.");
        } catch (TimeoutException e) {
            return new ConnectionTestResponse(false,
                    "Cluster inacessível: tempo limite excedido ao conectar em " + request.connectionAddress() + ".");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return new ConnectionTestResponse(false, "Teste de conexão interrompido.");
        } catch (ExecutionException | RuntimeException e) {
            return new ConnectionTestResponse(false, "Falha ao conectar: " + rootMessage(e));
        }
    }

    /**
     * Alimenta o seletor de tópico do editor de fluxo (US-03.09) com os tópicos reais do cluster
     * escolhido — o campo continua aceitando digitação livre no front (o tópico pode ainda não
     * existir no momento do design), isso aqui é só a sugestão.
     */
    @PostMapping("/topic-listings")
    public TopicListingResponse listTopics(@RequestBody ConnectionTestRequest request) {
        if (!"KAFKA".equals(request.clusterType())) {
            return new TopicListingResponse(false,
                    "Tipo de broker " + request.clusterType() + " ainda não é suportado neste ambiente.", List.of());
        }

        try (AdminClient adminClient = AdminClient.create(adminClientConfig(request))) {
            List<String> topics = adminClient.listTopics().names().get(TIMEOUT_MS, TimeUnit.MILLISECONDS)
                    .stream().sorted().toList();
            return new TopicListingResponse(true, null, topics);
        } catch (TimeoutException e) {
            return new TopicListingResponse(false,
                    "Cluster inacessível: tempo limite excedido ao conectar em " + request.connectionAddress() + ".", List.of());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return new TopicListingResponse(false, "Listagem de tópicos interrompida.", List.of());
        } catch (ExecutionException | RuntimeException e) {
            return new TopicListingResponse(false, "Falha ao listar tópicos: " + rootMessage(e), List.of());
        }
    }

    private Map<String, Object> adminClientConfig(ConnectionTestRequest request) {
        Map<String, Object> config = new HashMap<>();
        config.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, request.connectionAddress());
        config.put(AdminClientConfig.REQUEST_TIMEOUT_MS_CONFIG, TIMEOUT_MS);
        if (request.credentialReferenceName() != null && !request.credentialReferenceName().isBlank()) {
            credentialResolver.resolve(request.credentialReferenceName()).ifPresent(config::putAll);
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
