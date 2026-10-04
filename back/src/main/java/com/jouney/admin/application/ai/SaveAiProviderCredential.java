package com.jouney.admin.application.ai;

import com.jouney.admin.domain.ai.AiProvider;
import com.jouney.admin.domain.ai.AiProviderCredential;
import com.jouney.admin.domain.ai.AiProviderCredentialRepository;
import com.jouney.admin.domain.ai.InvalidAiCredentialException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Cria ou atualiza (upsert por provider — no máximo uma credencial por provedor, ver constraint
 * UNIQUE) a chave, o modelo e a marca de provedor ativo. A chave só é obrigatória na primeira vez;
 * depois, em branco significa "manter a que já está salva". Marcar um provedor como ativo desmarca o
 * anterior (no máximo um ativo). */
@Service
public class SaveAiProviderCredential {

    private final AiProviderCredentialRepository repository;

    public SaveAiProviderCredential(AiProviderCredentialRepository repository) {
        this.repository = repository;
    }

    // findByProvider é query derivada custom, igual deleteByProvider em DeleteAiProviderCredential —
    // mesmo motivo pra precisar de transação explícita aqui.
    @Transactional
    public AiProviderCredential execute(AiProvider provider, String apiKey, String model, boolean active) {
        AiProviderCredential credential = repository.findByProvider(provider).orElse(null);
        boolean hasKey = apiKey != null && !apiKey.isBlank();
        if (credential == null) {
            if (!hasKey) {
                throw new InvalidAiCredentialException("Informe a chave de API para configurar este provedor.");
            }
            credential = AiProviderCredential.create(provider, apiKey, model);
        } else {
            credential.update(apiKey, model);
        }
        if (active) {
            repository.findActive()
                    .filter(current -> current.getProvider() != provider)
                    .ifPresent(current -> {
                        current.setActive(false);
                        repository.save(current);
                    });
        }
        credential.setActive(active);
        return repository.save(credential);
    }
}
