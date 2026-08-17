package com.jouney.admin.interfaces.executionaudit;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record ExecutionStartedRequest(@NotNull UUID journeyId, @NotBlank String journeyName,
                                       @NotBlank String processInstanceId) {
}
