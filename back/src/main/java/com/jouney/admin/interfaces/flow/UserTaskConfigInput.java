package com.jouney.admin.interfaces.flow;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record UserTaskConfigInput(@NotNull UUID formId) {
}
