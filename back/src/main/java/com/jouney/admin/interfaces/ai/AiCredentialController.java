package com.jouney.admin.interfaces.ai;

import com.jouney.admin.application.ai.DeleteAiProviderCredential;
import com.jouney.admin.application.ai.GetAiProviderCredentialStatus;
import com.jouney.admin.application.ai.SaveAiProviderCredential;
import com.jouney.admin.domain.ai.AiProvider;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Credencial de provedor de IA usada pela geração de fluxo por prompt (FT-03) — reaproveita a
 * mesma tela de Integrações do catálogo de mensageria (FT-14), mas é um conceito separado: uma
 * chave de API global por provedor, não presa a um cluster. Leitura liberada; escrita restrita a
 * ADMIN, mesma regra do catálogo de credenciais de mensageria.
 */
@RestController
@RequestMapping("/api/v1/ai-credentials")
public class AiCredentialController {

    private final SaveAiProviderCredential saveAiProviderCredential;
    private final GetAiProviderCredentialStatus getAiProviderCredentialStatus;
    private final DeleteAiProviderCredential deleteAiProviderCredential;

    public AiCredentialController(SaveAiProviderCredential saveAiProviderCredential,
                                   GetAiProviderCredentialStatus getAiProviderCredentialStatus,
                                   DeleteAiProviderCredential deleteAiProviderCredential) {
        this.saveAiProviderCredential = saveAiProviderCredential;
        this.getAiProviderCredentialStatus = getAiProviderCredentialStatus;
        this.deleteAiProviderCredential = deleteAiProviderCredential;
    }

    @PreAuthorize("hasAnyRole('VIEWER','EDITOR','ADMIN')")
    @GetMapping("/{provider}")
    public AiCredentialStatusResponse status(@PathVariable AiProvider provider) {
        return getAiProviderCredentialStatus.execute(provider)
                .map(AiCredentialStatusResponse::from)
                .orElseGet(AiCredentialStatusResponse::notConfigured);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{provider}")
    public AiCredentialStatusResponse save(@PathVariable AiProvider provider, @Valid @RequestBody AiCredentialInput input) {
        return AiCredentialStatusResponse.from(saveAiProviderCredential.execute(provider, input.apiKey()));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{provider}")
    public ResponseEntity<Void> delete(@PathVariable AiProvider provider) {
        deleteAiProviderCredential.execute(provider);
        return ResponseEntity.noContent().build();
    }
}
