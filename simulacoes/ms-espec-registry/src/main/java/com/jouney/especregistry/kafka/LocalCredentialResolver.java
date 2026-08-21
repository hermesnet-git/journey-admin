package com.jouney.especregistry.kafka;

import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Component;

/**
 * ponytail: broker local não tem autenticação nenhuma (listener PLAINTEXT puro) — não há nada a
 * resolver. Trocar por uma implementação que fale com o Azure Key Vault de verdade quando essa
 * infraestrutura existir (Workload Identity/AKS), sem mudar quem chama {@link CredentialResolver}.
 */
@Component
public class LocalCredentialResolver implements CredentialResolver {

    @Override
    public Optional<Map<String, Object>> resolve(String credentialReferenceName) {
        return Optional.empty();
    }
}
