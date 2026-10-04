package com.jouney.admin.infrastructure.ai;

import com.jouney.admin.domain.ai.AiProvider;
import com.jouney.admin.domain.ai.AiProviderCredential;
import com.jouney.admin.domain.ai.AiProviderCredentialRepository;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Decide, a cada geração, qual provedor, qual chave e qual modelo usar: o provedor marcado como
 * ativo na tela de Integrações ou, sem nenhum, o Gemini. Resolvido a cada chamada (nada guardado em
 * campo) pra uma troca na tela valer imediatamente, sem reiniciar o servidor.
 */
@Component
public class AiModelSelector {

    private final AiProviderCredentialRepository credentialRepository;
    private final List<AiModelClient> clients;
    private final String geminiModel;

    public AiModelSelector(AiProviderCredentialRepository credentialRepository, List<AiModelClient> clients,
                           @Value("${gemini.model:gemini-3.5-flash-lite}") String geminiModel) {
        this.credentialRepository = credentialRepository;
        this.clients = clients;
        this.geminiModel = geminiModel;
    }

    public Selection select() {
        AiProviderCredential credential = credentialRepository.findActive()
                .or(() -> credentialRepository.findByProvider(AiProvider.GEMINI))
                .orElseThrow(() -> new AiGenerationException(
                        "Nenhum provedor de IA configurado. Configure em Integrações > Credencial de IA."));
        AiProvider provider = credential.getProvider();
        if (credential.getApiKey() == null || credential.getApiKey().isBlank()) {
            throw new AiGenerationException("A chave de API do provedor de IA não está configurada. "
                    + "Configure em Integrações > Credencial de IA.");
        }
        AiModelClient client = clients.stream().filter(c -> c.provider() == provider).findFirst()
                .orElseThrow(() -> new AiGenerationException("Provedor de IA sem suporte: " + provider));
        String model = credential.getModel() != null ? credential.getModel()
                : provider == AiProvider.GEMINI ? geminiModel : provider.defaultModel();
        return new Selection(provider, client, credential.getApiKey(), model);
    }

    public record Selection(AiProvider provider, AiModelClient client, String apiKey, String model) {
    }
}
