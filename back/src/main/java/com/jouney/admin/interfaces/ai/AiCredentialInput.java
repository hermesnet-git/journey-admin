package com.jouney.admin.interfaces.ai;

import jakarta.validation.constraints.NotBlank;

public record AiCredentialInput(@NotBlank String apiKey) {
}
