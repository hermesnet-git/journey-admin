package com.jouney.admin.interfaces.simulationaudit;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record SimulationStartedRequest(@NotNull UUID journeyId, @NotBlank String journeyName,
                                        @NotBlank String processInstanceId) {
}
