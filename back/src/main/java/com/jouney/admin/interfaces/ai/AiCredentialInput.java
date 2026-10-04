package com.jouney.admin.interfaces.ai;

import jakarta.validation.constraints.Size;

/** {@code apiKey} em branco mantém a chave já salva (só é obrigatória na primeira configuração do
 * provedor); {@code model} em branco usa o padrão do provedor. */
public record AiCredentialInput(String apiKey, @Size(max = 100) String model, boolean active) {
}
