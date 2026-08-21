package com.jouney.especregistry.kafka;

import java.util.HashMap;
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
 * Teste de conexão do catálogo de integrações (FT-14, US-14.04) — só metadado, nunca publica ou
 * consome uma mensagem real. Único componente que fala com o broker de verdade: o admin-back nunca
 * chama isso diretamente do navegador, sempre via chamada de servidor a servidor.
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

        Map<String, Object> config = new HashMap<>();
        config.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, request.connectionAddress());
        config.put(AdminClientConfig.REQUEST_TIMEOUT_MS_CONFIG, TIMEOUT_MS);
        if (request.credentialReferenceName() != null && !request.credentialReferenceName().isBlank()) {
            credentialResolver.resolve(request.credentialReferenceName()).ifPresent(config::putAll);
        }

        try (AdminClient adminClient = AdminClient.create(config)) {
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

    private String rootMessage(Throwable ex) {
        Throwable current = ex;
        while (current.getCause() != null && current.getCause() != current) {
            current = current.getCause();
        }
        return current.getMessage() != null ? current.getMessage() : current.getClass().getSimpleName();
    }
}
