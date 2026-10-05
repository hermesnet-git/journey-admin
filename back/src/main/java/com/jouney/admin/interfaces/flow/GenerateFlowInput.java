package com.jouney.admin.interfaces.flow;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record GenerateFlowInput(@NotBlank @Size(max = 6000) String prompt,
                                // Quantas rodadas de perguntas da IA o pedido já responde (0 na primeira chamada).
                                @Min(0) @Max(20) int rounds) {
}
