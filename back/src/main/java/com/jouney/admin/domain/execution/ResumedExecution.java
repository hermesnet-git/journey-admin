package com.jouney.admin.domain.execution;

import java.util.UUID;

/** Resultado de retomar uma instância `ACTIVE` já em andamento na tela de Execução (achada por ID
 * ou business key) — mesma forma de {@link ExecutionInstance}, com a identidade da jornada
 * agregada, que a busca por journeyId (feita ao iniciar do zero) já dispensava conhecer de
 * antemão. */
public record ResumedExecution(UUID journeyId, String journeyName, String channel, ExecutionInstance instance) {
}
