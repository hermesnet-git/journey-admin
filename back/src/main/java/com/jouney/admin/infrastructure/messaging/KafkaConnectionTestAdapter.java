package com.jouney.admin.infrastructure.messaging;

import com.jouney.admin.application.messaging.ConnectionTestResult;
import com.jouney.admin.application.messaging.MessagingConnectionTestPort;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.apache.kafka.clients.admin.AdminClient;
import org.apache.kafka.clients.admin.AdminClientConfig;
import org.springframework.stereotype.Component;

/**
 * Teste de conexão do catálogo de integrações (FT-14) — só metadado (describeCluster), nunca
 * publica ou consome uma mensagem real. Movido de ms-espec-registry/KafkaConnectionTestController:
 * o espec-registry passou a ser exclusivamente o guardião do catálogo SDUI, sem nenhuma
 * responsabilidade de runtime/mensageria.
 */
@Component
public class KafkaConnectionTestAdapter implements MessagingConnectionTestPort {

    private static final int TIMEOUT_MS = 5_000;

    private final CredentialResolver credentialResolver;

    public KafkaConnectionTestAdapter(CredentialResolver credentialResolver) {
        this.credentialResolver = credentialResolver;
    }

    @Override
    public ConnectionTestResult test(String clusterType, String connectionAddress, String credentialReferenceName) {
        if (!"KAFKA".equals(clusterType)) {
            return new ConnectionTestResult(false, "Tipo de broker " + clusterType + " ainda não é suportado neste ambiente.");
        }

        try (AdminClient adminClient = AdminClient.create(adminClientConfig(connectionAddress, credentialReferenceName))) {
            adminClient.describeCluster().nodes().get(TIMEOUT_MS, TimeUnit.MILLISECONDS);
            return new ConnectionTestResult(true, "Conexão estabelecida com sucesso.");
        } catch (TimeoutException e) {
            return new ConnectionTestResult(false, "Cluster inacessível: tempo limite excedido ao conectar em " + connectionAddress + ".");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return new ConnectionTestResult(false, "Teste de conexão interrompido.");
        } catch (ExecutionException | RuntimeException e) {
            return new ConnectionTestResult(false, "Falha ao conectar: " + rootMessage(e));
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
