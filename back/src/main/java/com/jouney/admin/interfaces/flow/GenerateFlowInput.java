package com.jouney.admin.interfaces.flow;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record GenerateFlowInput(@NotBlank @Size(max = 4000) String prompt) {
}
