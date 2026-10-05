package com.jouney.admin.infrastructure.messaging;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.time.Duration;
import java.util.Map;
import org.apache.kafka.clients.admin.AdminClient;
import org.apache.kafka.clients.admin.AdminClientConfig;

/**
 * Apoio dos testes de conexão/listagem: o AdminClient repete a busca de metadata até o
 * default.api.timeout.ms (60 s) e o close() espera isso, então o cliente é limitado ao mesmo prazo
 * do teste e fechado logo; e uma checagem TCP antes evita criá-lo quando o broker está desligado.
 */
final class KafkaAdminSupport {

    static final int TIMEOUT_MS = 5_000;
    private static final int TCP_TIMEOUT_MS = 2_000;

    private KafkaAdminSupport() {
    }

    /** true se algum endereço do bootstrap abre TCP (ou se não deu para interpretar a lista). */
    static boolean reachable(String bootstrapServers) {
        boolean parsed = false;
        for (String entry : bootstrapServers.split(",")) {
            String address = entry.trim().replaceFirst("^[a-zA-Z_]+://", "");
            int colon = address.lastIndexOf(':');
            if (colon <= 0) continue;
            try {
                int port = Integer.parseInt(address.substring(colon + 1));
                parsed = true;
                try (Socket socket = new Socket()) {
                    socket.connect(new InetSocketAddress(address.substring(0, colon), port), TCP_TIMEOUT_MS);
                    return true;
                } catch (IOException ignored) {
                    // tenta o próximo endereço
                }
            } catch (NumberFormatException ignored) {
                // endereço fora do padrão host:porta, não bloqueia
            }
        }
        return !parsed;
    }

    static AdminClient create(Map<String, Object> config) {
        config.put(AdminClientConfig.REQUEST_TIMEOUT_MS_CONFIG, TIMEOUT_MS);
        config.put(AdminClientConfig.DEFAULT_API_TIMEOUT_MS_CONFIG, TIMEOUT_MS);
        return AdminClient.create(config);
    }

    static void close(AdminClient client) {
        client.close(Duration.ofSeconds(1));
    }

    static String unreachableMessage(String connectionAddress) {
        return "Cluster inacessível: não foi possível abrir conexão com " + connectionAddress + ".";
    }
}
