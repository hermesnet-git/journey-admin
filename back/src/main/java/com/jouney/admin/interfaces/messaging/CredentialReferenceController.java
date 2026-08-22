package com.jouney.admin.interfaces.messaging;

import com.jouney.admin.application.messaging.CreateCredential;
import com.jouney.admin.application.messaging.DeleteCredential;
import com.jouney.admin.application.messaging.FindCredentials;
import com.jouney.admin.application.messaging.GetCredential;
import com.jouney.admin.application.messaging.TestCredentialConnection;
import com.jouney.admin.application.messaging.UpdateCredential;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Catálogo de referências de credencial (FT-14, US-14.02) — nunca guarda o valor do segredo
 * (REQ-14.02.003), só a referência ao Key Vault. Leitura liberada; escrita restrita a ADMIN
 * (REQ-14.03.001).
 */
@RestController
@RequestMapping("/api/v1/credential-references")
public class CredentialReferenceController {

    private final CreateCredential createCredential;
    private final UpdateCredential updateCredential;
    private final GetCredential getCredential;
    private final FindCredentials findCredentials;
    private final DeleteCredential deleteCredential;
    private final TestCredentialConnection testCredentialConnection;

    public CredentialReferenceController(CreateCredential createCredential, UpdateCredential updateCredential,
                                          GetCredential getCredential, FindCredentials findCredentials,
                                          DeleteCredential deleteCredential,
                                          TestCredentialConnection testCredentialConnection) {
        this.createCredential = createCredential;
        this.updateCredential = updateCredential;
        this.getCredential = getCredential;
        this.findCredentials = findCredentials;
        this.deleteCredential = deleteCredential;
        this.testCredentialConnection = testCredentialConnection;
    }

    @PreAuthorize("hasAnyRole('VIEWER','EDITOR','ADMIN')")
    @GetMapping
    public List<CredentialResponse> list(@RequestParam(required = false) String q,
                                          @RequestParam(required = false) UUID clusterId) {
        return findCredentials.execute(q, clusterId).stream().map(CredentialResponse::from).toList();
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<CredentialResponse> create(@Valid @RequestBody CredentialInput input) {
        var credential = createCredential.execute(input.referenceName(), input.clusterId(), input.keyVaultUri(),
                input.secretName());
        return ResponseEntity.status(HttpStatus.CREATED).body(CredentialResponse.from(credential));
    }

    @PreAuthorize("hasAnyRole('VIEWER','EDITOR','ADMIN')")
    @GetMapping("/{credentialId}")
    public CredentialResponse get(@PathVariable UUID credentialId) {
        return CredentialResponse.from(getCredential.execute(credentialId));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{credentialId}")
    public CredentialResponse update(@PathVariable UUID credentialId, @Valid @RequestBody CredentialInput input) {
        return CredentialResponse.from(updateCredential.execute(credentialId, input.referenceName(),
                input.clusterId(), input.keyVaultUri(), input.secretName()));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{credentialId}")
    public ResponseEntity<Void> delete(@PathVariable UUID credentialId) {
        deleteCredential.execute(credentialId);
        return ResponseEntity.noContent().build();
    }

    // Mesma role do teste de conector REST existente (REQ-03.10.002) — validar que uma credencial
    // funciona não é uma ação de administração do catálogo, é parte de configurar um conector.
    @PreAuthorize("hasAnyRole('EDITOR','ADMIN')")
    @PostMapping("/{credentialId}/connection-test")
    public ConnectionTestResponse testConnection(@PathVariable UUID credentialId) {
        return ConnectionTestResponse.from(testCredentialConnection.execute(credentialId));
    }
}
