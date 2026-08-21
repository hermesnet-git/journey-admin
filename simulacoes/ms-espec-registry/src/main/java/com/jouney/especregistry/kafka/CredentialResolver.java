package com.jouney.especregistry.kafka;

import java.util.Map;
import java.util.Optional;

/**
 * Resolve uma referência de credencial (FT-14) em propriedades de autenticação a aplicar sobre a
 * config do client Kafka/Event Hubs/Service Bus antes de abrir uma conexão — nunca o admin-back
 * resolve isso, só quem de fato abre a conexão. Sem implementação real de Key Vault ainda
 * (nenhuma dependência Azure no projeto); {@link LocalCredentialResolver} é o único ponto de
 * extensão hoje, cobrindo o broker local sem autenticação.
 */
public interface CredentialResolver {

    Optional<Map<String, Object>> resolve(String credentialReferenceName);
}
